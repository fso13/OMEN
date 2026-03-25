import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  INITIAL_SHELL,
  MAX_COMMAND_HISTORY,
  execLine,
  getBootLines,
  getTerminalBannerLines,
  getPromptParts,
  type OutputLine,
  type ShellState,
} from "./shell";
import { VFS_FILES } from "./vfsData";
import { OPENING_MAIL } from "./openingEmail";
import { EXTRA_MAILS, getExtraMailById } from "./extraMail";
import {
  clearSavedGame,
  loadGame,
  loadPlayerNotes,
  saveGame,
  savePlayerNotes,
  type PersistedGameV1,
} from "./persist";
import { EndEmailStream } from "./EndEmailStream";
import { tabComplete } from "./completion";
import "../styles.css";

function getInitialFromStorage(): {
  introComplete: boolean;
  bootComplete: boolean;
  bootDone: boolean;
  bootIndex: number;
  shell: ShellState;
  lines: OutputLine[];
  endScreen: { visible: boolean; text: string };
  runBootOnMount: boolean;
  commandHistory: string[];
  unlockedMailIds: string[];
  readMailIds: string[];
} {
  const saved = loadGame();
  const bootLines = getBootLines();
  if (saved?.introComplete) {
    const bootComplete = saved.bootComplete !== false;
    const readMailIds = saved.readMailIds ?? (saved.introComplete ? ["opening"] : []);
    return {
      introComplete: true,
      bootComplete,
      bootDone: bootComplete,
      bootIndex: bootComplete ? bootLines.length : 0,
      shell: saved.shell,
      lines: saved.lines,
      endScreen: saved.endScreen,
      runBootOnMount: !bootComplete,
      commandHistory: saved.commandHistory ?? [],
      unlockedMailIds: saved.unlockedMailIds ?? [],
      readMailIds,
    };
  }
  return {
    introComplete: false,
    bootComplete: false,
    bootDone: false,
    bootIndex: 0,
    shell: { ...INITIAL_SHELL },
    lines: [],
    endScreen: { visible: false, text: "" },
    runBootOnMount: false,
    commandHistory: [],
    unlockedMailIds: [],
    readMailIds: [],
  };
}

export function App() {
  const init = getInitialFromStorage();
  const [introComplete, setIntroComplete] = useState(init.introComplete);
  const [bootComplete, setBootComplete] = useState(init.bootComplete);
  const [shell, setShell] = useState<ShellState>(init.shell);
  const [lines, setLines] = useState<OutputLine[]>(init.lines);
  const [bootIndex, setBootIndex] = useState(init.bootIndex);
  const [bootDone, setBootDone] = useState(init.bootDone);
  const [bootSession, setBootSession] = useState(init.runBootOnMount ? 1 : 0);
  const bootTimers = useRef<number[]>([]);
  const [reader, setReader] = useState<{ title: string; html: string } | null>(null);
  const [endScreen, setEndScreen] = useState(init.endScreen);
  const [input, setInput] = useState("");
  const [tabHint, setTabHint] = useState<string | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>(init.commandHistory);
  const [notesText, setNotesText] = useState(() => loadPlayerNotes());
  const [unlockedMailIds, setUnlockedMailIds] = useState<string[]>(init.unlockedMailIds);
  const [readMailIds, setReadMailIds] = useState<string[]>(init.readMailIds);
  const [mailModal, setMailModal] = useState<
    null | { kind: "opening" } | { kind: "extra"; id: string }
  >(null);
  const outRef = useRef<HTMLPreElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const notesSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerInjectedRef = useRef(false);

  const bootLines = getBootLines();

  useEffect(() => {
    bannerInjectedRef.current = false;
  }, [bootSession]);

  useEffect(() => {
    if (!bootDone || !introComplete) return;
    setLines((prev) => {
      if (prev.length > 0 || bannerInjectedRef.current) return prev;
      bannerInjectedRef.current = true;
      return getTerminalBannerLines().map((text) => ({ text, kind: "banner" as const }));
    });
  }, [bootDone, introComplete]);

  useEffect(() => {
    if (!introComplete) return;
    if (bootSession === 0) return;

    setBootIndex(0);
    setBootDone(false);
    bootTimers.current.forEach((id) => clearTimeout(id));
    bootTimers.current = [];
    let i = 0;
    let cancelled = false;
    function tick() {
      if (cancelled) return;
      if (i >= bootLines.length) {
        setBootDone(true);
        setBootComplete(true);
        return;
      }
      i += 1;
      setBootIndex(i);
      const id = window.setTimeout(tick, 380 + Math.random() * 200);
      bootTimers.current.push(id);
    }
    tick();
    return () => {
      cancelled = true;
      bootTimers.current.forEach((id) => clearTimeout(id));
      bootTimers.current = [];
    };
  }, [bootSession, introComplete, bootLines.length]);

  useEffect(() => {
    if (bootDone) {
      inputRef.current?.focus();
    }
  }, [bootDone]);

  useEffect(() => {
    outRef.current?.scrollTo(0, outRef.current.scrollHeight);
  }, [lines, bootIndex]);

  useEffect(() => {
    if (!introComplete) return;
    const payload: PersistedGameV1 = {
      v: 1,
      introComplete: true,
      bootComplete,
      shell,
      lines,
      endScreen,
      commandHistory,
      unlockedMailIds,
      readMailIds,
    };
    saveGame(payload);
  }, [
    introComplete,
    bootComplete,
    shell,
    lines,
    endScreen,
    commandHistory,
    unlockedMailIds,
    readMailIds,
  ]);

  useEffect(() => {
    if (notesSaveTimer.current) clearTimeout(notesSaveTimer.current);
    notesSaveTimer.current = setTimeout(() => {
      savePlayerNotes(notesText);
      notesSaveTimer.current = null;
    }, 400);
    return () => {
      if (notesSaveTimer.current) clearTimeout(notesSaveTimer.current);
    };
  }, [notesText]);

  const closeOpeningLetter = useCallback(() => {
    setReadMailIds((prev) => (prev.includes("opening") ? prev : [...prev, "opening"]));
    setIntroComplete(true);
    setBootSession((s) => s + 1);
  }, []);

  const resetGame = useCallback(() => {
    clearSavedGame();
    setShell({ ...INITIAL_SHELL });
    setLines([]);
    setReader(null);
    setEndScreen({ visible: false, text: "" });
    setInput("");
    setIntroComplete(false);
    setBootComplete(false);
    setBootIndex(0);
    setBootDone(false);
    setBootSession(0);
    setCommandHistory([]);
    setUnlockedMailIds([]);
    setReadMailIds([]);
    setMailModal(null);
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTabHint(null);
    if (!bootDone || shell.ended) return;
    const line = input;
    setInput("");
    const wasPendingSu = shell.pendingSu;
    const prevUnlocked = unlockedMailIds;
    const result = execLine(VFS_FILES, shell, line, commandHistory);
    setShell(result.nextState);
    if (line.trim() && !wasPendingSu) {
      setCommandHistory((prev) => {
        const next = [...prev, line];
        if (next.length > MAX_COMMAND_HISTORY) return next.slice(-MAX_COMMAND_HISTORY);
        return next;
      });
    }
    const newMailIds = (result.mailTriggers ?? []).filter((id) => !prevUnlocked.includes(id));

    if (result.clearOutput) {
      bannerInjectedRef.current = true;
      setLines(
        getTerminalBannerLines().map((text) => ({ text, kind: "banner" as const }))
      );
    } else if (result.lines.length) {
      setLines((prev) => {
        let next = [...prev, ...result.lines];
        if (newMailIds.length) {
          next = [
            ...next,
            {
              text:
                newMailIds.length === 1
                  ? "Новое письмо в ящике (слева)."
                  : `Новые письма в ящике (${newMailIds.length}).`,
              kind: "normal" as const,
            },
          ];
        }
        return next;
      });
    } else if (newMailIds.length) {
      setLines((prev) => [
        ...prev,
        {
          text:
            newMailIds.length === 1
              ? "Новое письмо в ящике (слева)."
              : `Новые письма в ящике (${newMailIds.length}).`,
          kind: "normal" as const,
        },
      ]);
    }
    if (result.reader) {
      setReader(result.reader);
    }
    if (result.endScreen) {
      setEndScreen(result.endScreen);
    }
    if (result.mailTriggers?.length) {
      setUnlockedMailIds((prev) => {
        const next = new Set([...prev, ...result.mailTriggers!]);
        return [...next];
      });
    }
  };

  const closeReader = () => {
    setReader(null);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (reader) {
        e.preventDefault();
        closeReader();
        return;
      }
      if (mailModal) {
        e.preventDefault();
        setMailModal(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [reader, mailModal]);

  const mailInboxRows = useMemo(() => {
    const extras = EXTRA_MAILS.filter((m) => unlockedMailIds.includes(m.id)).sort(
      (a, b) => a.order - b.order
    );
    return extras;
  }, [unlockedMailIds]);

  const openSidebarOpening = () => {
    setMailModal({ kind: "opening" });
    setReadMailIds((p) => (p.includes("opening") ? p : [...p, "opening"]));
  };

  const openSidebarExtra = (id: string) => {
    setMailModal({ kind: "extra", id });
    setReadMailIds((p) => (p.includes(id) ? p : [...p, id]));
  };

  const prompt = getPromptParts(shell);

  return (
    <>
      {!introComplete && (
        <div
          className="reader-overlay opening-mail-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="openingMailTitle"
        >
          <div className="reader-panel opening-mail-panel" onClick={(e) => e.stopPropagation()}>
            <header className="reader-head">
              <h2 className="reader-title" id="openingMailTitle">
                {OPENING_MAIL.subject}
              </h2>
            </header>
            <div className="reader-body">
              <div className="opening-mail-meta">
                <span>От: {OPENING_MAIL.from}</span>
                <span>К: {OPENING_MAIL.to}</span>
              </div>
              <pre className="reader-text opening-mail-body">{OPENING_MAIL.body}</pre>
              <div className="opening-mail-actions">
                <button type="button" className="end-btn" onClick={closeOpeningLetter}>
                  Закрыть и войти в терминал
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {introComplete && (
        <div className="scene scene--matrix">
          <div className="scene-bg scene-bg--matrix" />
          <div className="matrix-rain matrix-rain--bg" aria-hidden="true" />
          <div className="desktop-workspace">
            <aside className="side-panel side-panel--mail" aria-label="Почта">
              <h2 className="side-panel-title">Почта</h2>
              <p className="side-panel-hint">tomas.anderson13@matrix.com</p>
              <ul className="mail-list">
                <li>
                  <button
                    type="button"
                    className={
                      "mail-row" + (!readMailIds.includes("opening") ? " mail-row--unread" : "")
                    }
                    onClick={openSidebarOpening}
                  >
                    <span className="mail-row-subject">{OPENING_MAIL.subject}</span>
                    <span className="mail-row-meta">{OPENING_MAIL.from}</span>
                  </button>
                </li>
                {mailInboxRows.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className={
                        "mail-row mail-row--" +
                        m.kind +
                        (!readMailIds.includes(m.id) ? " mail-row--unread" : "")
                      }
                      onClick={() => openSidebarExtra(m.id)}
                    >
                      <span className="mail-row-subject">{m.subject}</span>
                      <span className="mail-row-meta">{m.from}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
            <div className="desktop-center">
              <div className="crt-frame crt-frame--matrix">
                <div className="crt-bezel">
                  <div className="crt-screen">
                    <div className="scanlines" aria-hidden="true" />
                    <div className="crt-vignette" aria-hidden="true" />
                    <div className="terminal-app">
                      <div className="boot-block">
                        {bootLines.slice(0, bootIndex).map((t, i) => (
                          <div key={i} className="boot-line">
                            {t}
                          </div>
                        ))}
                      </div>
                      {bootDone && (
                        <div className="terminal-body">
                          <pre ref={outRef} className="terminal-scroll" tabIndex={-1}>
                            {lines.map((ln, i) => (
                              <div
                                key={i}
                                className={
                                  "terminal-line" +
                                  (ln.kind === "cmd"
                                    ? " terminal-line--cmd"
                                    : ln.kind === "err"
                                      ? " terminal-line--err"
                                      : ln.kind === "banner"
                                        ? " terminal-line--banner"
                                        : "")
                                }
                              >
                                {ln.text}
                              </div>
                            ))}
                          </pre>
                          <form className="prompt-line" onSubmit={onSubmit} autoComplete="off">
                            <span className="prompt-user">{prompt.userHost}</span>
                            <span className="prompt-sep">:</span>
                            <span className="prompt-path">{prompt.pathShort}</span>
                            <span className="prompt-dollar">$</span>
                            <input
                              ref={inputRef}
                              type="text"
                              className="prompt-input"
                              value={input}
                              onChange={(e) => {
                                setInput(e.target.value);
                                setTabHint(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key !== "Tab") return;
                                e.preventDefault();
                                const res = tabComplete(VFS_FILES, shell, input);
                                if (!res) return;
                                setInput(res.replacement);
                                setTabHint(res.hint ?? null);
                              }}
                              spellCheck={false}
                              autoCapitalize="off"
                              disabled={shell.ended}
                            />
                          </form>
                          {tabHint && (
                            <div className="tab-hint" aria-live="polite">
                              {tabHint}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <aside className="side-panel side-panel--notes" aria-label="Заметки">
              <h2 className="side-panel-title">Заметки</h2>
              <p className="side-panel-hint">Сохраняются в браузере</p>
              <textarea
                className="notes-sticker"
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Пароли, якоря, мысли…"
                spellCheck={false}
                aria-label="Текстовые заметки"
              />
            </aside>
          </div>
          <div className="hud-bar">
            <button
              type="button"
              className="hud-close"
              onClick={() => {
                if (reader) closeReader();
              }}
            >
              Закрыть
            </button>
          </div>
          {mailModal && (
            <div
              className="reader-overlay opening-mail-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="sidebarMailTitle"
              onClick={(e) => {
                if (e.target === e.currentTarget) setMailModal(null);
              }}
            >
              <div className="reader-panel opening-mail-panel" onClick={(e) => e.stopPropagation()}>
                <header className="reader-head">
                  <h2 className="reader-title" id="sidebarMailTitle">
                    {mailModal.kind === "opening"
                      ? OPENING_MAIL.subject
                      : getExtraMailById(mailModal.id)?.subject ?? ""}
                  </h2>
                  <button
                    type="button"
                    className="reader-close"
                    aria-label="Закрыть"
                    onClick={() => setMailModal(null)}
                  >
                    ×
                  </button>
                </header>
                <div className="reader-body">
                  {mailModal.kind === "opening" ? (
                    <>
                      <div className="opening-mail-meta">
                        <span>От: {OPENING_MAIL.from}</span>
                        <span>К: {OPENING_MAIL.to}</span>
                      </div>
                      <pre className="reader-text opening-mail-body">{OPENING_MAIL.body}</pre>
                    </>
                  ) : (
                    (() => {
                      const em = getExtraMailById(mailModal.id);
                      if (!em) return null;
                      return (
                        <>
                          <div className="opening-mail-meta">
                            <span>От: {em.from}</span>
                            <span>К: {OPENING_MAIL.to}</span>
                          </div>
                          <pre className="reader-text opening-mail-body">{em.body}</pre>
                        </>
                      );
                    })()
                  )}
                  <div className="opening-mail-actions">
                    <button type="button" className="end-btn" onClick={() => setMailModal(null)}>
                      Закрыть
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {reader && (
        <div
          className="reader-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeReader();
          }}
        >
          <div
            className="reader-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="readerTitle"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="reader-head">
              <h2 className="reader-title" id="readerTitle">
                {reader.title}
              </h2>
              <button type="button" className="reader-close" aria-label="Закрыть" onClick={closeReader}>
                ×
              </button>
            </header>
            <div className="reader-body">
              <pre className="reader-text" dangerouslySetInnerHTML={{ __html: reader.html }} />
            </div>
          </div>
        </div>
      )}

      {endScreen.visible && (
        <div className="end-screen">
          <div className="end-panel end-panel--with-stream">
            <pre className="end-text">{endScreen.text}</pre>
            <EndEmailStream />
            <button
              type="button"
              className="end-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                resetGame();
              }}
            >
              Начать снова
            </button>
          </div>
        </div>
      )}
    </>
  );
}

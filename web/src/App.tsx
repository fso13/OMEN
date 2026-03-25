import { useCallback, useEffect, useRef, useState } from "react";
import {
  INITIAL_SHELL,
  execLine,
  getBootLines,
  getPromptParts,
  type OutputLine,
  type ShellState,
} from "./shell";
import { VFS_FILES } from "./vfsData";
import "../styles.css";

export function App() {
  const [shell, setShell] = useState<ShellState>(() => ({ ...INITIAL_SHELL }));
  const [lines, setLines] = useState<OutputLine[]>([]);
  const [bootIndex, setBootIndex] = useState(0);
  const [bootDone, setBootDone] = useState(false);
  const [bootSession, setBootSession] = useState(0);
  const bootTimers = useRef<number[]>([]);
  const [reader, setReader] = useState<{ title: string; html: string } | null>(null);
  const [endScreen, setEndScreen] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: "",
  });
  const [input, setInput] = useState("");
  const outRef = useRef<HTMLPreElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const bootLines = getBootLines();

  useEffect(() => {
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
  }, [bootSession, bootLines.length]);

  useEffect(() => {
    if (bootDone) {
      inputRef.current?.focus();
    }
  }, [bootDone]);

  useEffect(() => {
    outRef.current?.scrollTo(0, outRef.current.scrollHeight);
  }, [lines, bootIndex]);

  const resetGame = useCallback(() => {
    setShell({ ...INITIAL_SHELL });
    setLines([]);
    setReader(null);
    setEndScreen({ visible: false, text: "" });
    setInput("");
    setBootSession((s) => s + 1);
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bootDone || shell.ended) return;
    const line = input;
    setInput("");
    const result = execLine(VFS_FILES, shell, line);
    setShell(result.nextState);
    if (result.clearOutput) {
      setLines([]);
    } else if (result.lines.length) {
      setLines((prev) => [...prev, ...result.lines]);
    }
    if (result.reader) {
      setReader(result.reader);
    }
    if (result.endScreen) {
      setEndScreen(result.endScreen);
    }
  };

  const closeReader = () => {
    setReader(null);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && reader) {
        e.preventDefault();
        closeReader();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [reader]);

  const prompt = getPromptParts(shell);

  return (
    <>
      <div className="scene" aria-hidden="true">
        <div className="scene-bg" />
        <div className="crt-frame">
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
                        onChange={(e) => setInput(e.target.value)}
                        spellCheck={false}
                        autoCapitalize="off"
                        disabled={shell.ended}
                      />
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
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
      </div>

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
          <div className="end-panel">
            <pre className="end-text">{endScreen.text}</pre>
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

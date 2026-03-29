import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useCallback, useEffect, useRef, useState } from "react";
import { clearSave, loadGame, saveGame } from "./persist";
import {
  deserializeGame,
  executeLine,
  getPrompt,
  initialGameState,
  serializeGame,
  shouldMaskInput,
  type GameState,
} from "./shell";

const BOOT = [
  "Загрузка libcrypto… ok",
  "Монтирование локальной ФС… ok",
  "Подключение к term.staging.null… ok",
  "Сессия: guest. Введите help.",
  "",
  "  ORACLE/SHADOW · OMEN",
  "  ─────────────────────",
  "",
];

const EMAIL_BODY = `Ты ищешь вход. Вход ищет тебя.

host: term.staging.null (уже подключено)
user: guest
pass: silencio-7

Якорь для сверки: SILENCE-KEY-7

Дальше — только если умеешь читать то, что не предназначено для экрана.

Подсказка: ssh guest@main — затем пароль из этого письма, затем серийник терминала (см. photo_ticket.jpg.meta и night_shift_notes на main после входа).
`;

export function App() {
  const [showEmail, setShowEmail] = useState(true);
  const [gameState, setGameState] = useState<GameState>(() => initialGameState());
  const termRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const lineBuffer = useRef("");
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const writePrompt = useCallback((term: Terminal, state: GameState) => {
    term.write(getPrompt(state));
  }, []);

  const runCommandLine = useCallback(
    (line: string) => {
      const term = termInstance.current;
      if (!term) return;
      const state = gameStateRef.current;
      const { state: next, lines } = executeLine(state, line);
      setGameState(next);
      gameStateRef.current = next;

      for (const ln of lines) {
        if (ln === "__CLEAR__") {
          term.clear();
          continue;
        }
        term.writeln(ln);
      }
      writePrompt(term, next);
    },
    [writePrompt]
  );

  useEffect(() => {
    if (showEmail || !termRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
      theme: {
        background: "#0a0e12",
        foreground: "#c8d0d8",
        cursor: "#8ab4d8",
        black: "#0a0e12",
        red: "#e06c75",
        green: "#98c379",
        yellow: "#e5c07b",
        blue: "#61afef",
        cyan: "#56b6c2",
      },
      scrollback: 5000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(termRef.current);
    fit.fit();
    termInstance.current = term;
    fitAddon.current = fit;

    const saved = loadGame();
    if (saved) {
      const g = deserializeGame(saved);
      if (g) {
        setGameState(g);
        gameStateRef.current = g;
        term.writeln("(Загружено сохранение)");
        writePrompt(term, g);
      } else {
        for (const l of BOOT) term.writeln(l);
        writePrompt(term, initialGameState());
      }
    } else {
      for (const l of BOOT) term.writeln(l);
      writePrompt(term, gameStateRef.current);
    }

    const onData = (data: string) => {
      const st = gameStateRef.current;
      const mask = shouldMaskInput(st);

      if (st.flags.sealFinal) {
        const code = data.charCodeAt(0);
        if (code === 13 || code === 10) {
          const cmd = lineBuffer.current;
          lineBuffer.current = "";
          term.write("\r\n");
          runCommandLine(cmd);
          return;
        }
        if (code === 127 || code === 8) {
          if (lineBuffer.current.length > 0) {
            lineBuffer.current = lineBuffer.current.slice(0, -1);
            term.write("\b \b");
          }
          return;
        }
        if (data.length === 1 && code >= 32) {
          lineBuffer.current += data;
          term.write(data);
        }
        return;
      }

      const code = data.charCodeAt(0);
      if (code === 13 || code === 10) {
        const cmd = lineBuffer.current;
        lineBuffer.current = "";
        term.write("\r\n");
        runCommandLine(cmd);
        return;
      }
      if (code === 127 || code === 8) {
        if (lineBuffer.current.length > 0) {
          lineBuffer.current = lineBuffer.current.slice(0, -1);
          term.write("\b \b");
        }
        return;
      }
      lineBuffer.current += data;
      term.write(mask ? "*" : data);
    };

    term.onData(onData);

    const onResize = () => fit.fit();
    window.addEventListener("resize", onResize);

    const onKeySave = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveGame(serializeGame(gameStateRef.current));
        term.writeln("\r\n[сохранено в браузере]\r\n");
        writePrompt(term, gameStateRef.current);
      }
    };
    window.addEventListener("keydown", onKeySave);

    queueMicrotask(() => fit.fit());

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeySave);
      term.dispose();
      termInstance.current = null;
    };
  }, [showEmail, runCommandLine, writePrompt]);

  const handleStart = () => {
    setShowEmail(false);
  };

  const handleSave = () => {
    saveGame(serializeGame(gameState));
    const t = termInstance.current;
    if (t) {
      t.writeln("\r\n[сохранено]\r\n");
      writePrompt(t, gameStateRef.current);
    }
  };

  const handleLoad = () => {
    const raw = loadGame();
    if (!raw) return;
    const g = deserializeGame(raw);
    if (!g) return;
    setGameState(g);
    gameStateRef.current = g;
    const t = termInstance.current;
    if (t) {
      t.clear();
      t.writeln("(Игра загружена)");
      writePrompt(t, g);
    }
  };

  const handleReset = () => {
    clearSave();
    const g = initialGameState();
    setGameState(g);
    gameStateRef.current = g;
    const t = termInstance.current;
    if (t) {
      t.clear();
      for (const l of BOOT) t.writeln(l);
      writePrompt(t, g);
    }
  };

  return (
    <div className="app">
      <div className="toolbar">
        <span className="title">ORACLE/SHADOW · консоль</span>
        <button type="button" onClick={handleSave}>
          Сохранить
        </button>
        <button type="button" onClick={handleLoad}>
          Загрузить
        </button>
        <button type="button" onClick={handleReset}>
          Сброс
        </button>
      </div>
      {showEmail ? (
        <div className="email-panel">
          <h1>Входящее</h1>
          <div className="meta">От: &lt;null@void.route&gt; · Тема: (пусто)</div>
          <pre>{EMAIL_BODY}</pre>
          <button type="button" onClick={handleStart}>
            Открыть терминал
          </button>
        </div>
      ) : null}
      <div className="terminal-wrap" ref={termRef} />
    </div>
  );
}

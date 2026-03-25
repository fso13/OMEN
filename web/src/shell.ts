/**
 * Stateless shell: pure functions for OMEN terminal emulation.
 */

export interface ShellState {
  cwd: string;
  user: string;
  ended: boolean;
  pendingSu?: boolean;
}

export const INITIAL_SHELL: ShellState = {
  cwd: "/home/guest",
  user: "guest",
  ended: false,
};

export interface OutputLine {
  text: string;
  kind?: "normal" | "cmd" | "err";
}

export interface ExecResult {
  nextState: ShellState;
  lines: OutputLine[];
  clearOutput?: boolean;
  reader?: { title: string; html: string } | null;
  endScreen?: { visible: boolean; text: string };
}

const BOOT_LINES = [
  "Загрузка libcrypto… ok",
  "Монтирование локальной ФС… ok",
  "Подключение к term.staging.null… ok",
  "Сессия: guest. Введите help для справки.",
];

export function getBootLines(): string[] {
  return BOOT_LINES;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function randomHex(len: number): string {
  const a = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < len; i++) s += a[(Math.random() * 16) | 0];
  return s;
}

function glitchHtml(text: string): string {
  const lines = text.split("\n");
  const parts: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = escapeHtml(lines[i]);
    if (line.length > 40 && Math.random() > 0.65) {
      const ins = ` <span class="glitch">$/${randomHex(16)}#ERR:${randomHex(6)}%</span> `;
      const pos = 12 + ((Math.random() * (line.length - 24)) | 0);
      line = line.slice(0, pos) + ins + line.slice(pos);
    }
    parts.push(line);
  }
  return parts.join("\n");
}

function normalizeAbs(p: string): string {
  const parts = p.split("/").filter(Boolean);
  const stack: string[] = [];
  for (const x of parts) {
    if (x === "..") stack.pop();
    else if (x !== ".") stack.push(x);
  }
  return "/" + stack.join("/");
}

function resolvePath(cwd: string, input: string): string {
  if (!input) return cwd;
  const raw = input.trim();
  if (!raw) return cwd;
  if (raw.startsWith("/")) return normalizeAbs(raw);
  return normalizeAbs(cwd + "/" + raw);
}

function basename(p: string): string {
  const n = normalizeAbs(p);
  const i = n.lastIndexOf("/");
  return i < 0 ? n : n.slice(i + 1);
}

function fileExists(files: Record<string, string>, path: string): boolean {
  return Object.prototype.hasOwnProperty.call(files, path);
}

function isDirectory(files: Record<string, string>, path: string): boolean {
  const n = normalizeAbs(path);
  if (n === "/") return true;
  if (fileExists(files, n)) return false;
  const prefix = n.endsWith("/") ? n : n + "/";
  for (const k of Object.keys(files)) {
    if (k === n) continue;
    if (k.startsWith(prefix)) return true;
  }
  return false;
}

function listDir(files: Record<string, string>, dir: string): string[] | null {
  const d = normalizeAbs(dir);
  if (!fileExists(files, d) && !isDirectory(files, d)) return null;
  if (fileExists(files, d)) return null;
  const prefix = d === "/" ? "/" : d + "/";
  const names = new Set<string>();
  for (const k of Object.keys(files)) {
    if (d === "/") {
      const seg = k.split("/").filter(Boolean)[0];
      if (seg) names.add(seg);
      continue;
    }
    if (!k.startsWith(prefix)) continue;
    const rest = k.slice(prefix.length);
    const seg = rest.split("/")[0];
    if (seg) names.add(seg);
  }
  return Array.from(names).sort();
}

export function pathDisplay(p: string): string {
  if (p === "/home/guest") return "~";
  if (p.startsWith("/home/guest/")) return "~/" + p.slice("/home/guest/".length);
  if (p === "/home/operator") return "~";
  if (p.startsWith("/home/operator/")) return "~/" + p.slice("/home/operator/".length);
  return p;
}

function printPromptString(state: ShellState): string {
  const short = pathDisplay(state.cwd);
  return `${state.user}@staging:${short}$`;
}

export function getPromptParts(state: ShellState): { userHost: string; pathShort: string } {
  return {
    userHost: `${state.user}@staging`,
    pathShort: pathDisplay(state.cwd),
  };
}

function tokenize(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      cur += c;
      if (c === q && line[i - 1] !== "\\") q = null;
      continue;
    }
    if (c === '"' || c === "'") {
      q = c;
      cur += c;
      continue;
    }
    if (c === " " || c === "\t") {
      if (cur) out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur) out.push(cur);
  return out.map((t) => t.replace(/^["']|["']$/g, ""));
}

function restAfterCmd(line: string, name: string): string {
  const re = new RegExp("^\\s*" + name + "\\s+", "i");
  const m = line.match(re);
  if (!m) return "";
  return line.slice(m.index! + m[0].length).trim();
}

export function execLine(
  files: Record<string, string>,
  state: ShellState,
  line: string
): ExecResult {
  const t = line.trim();
  if (!t) {
    return { nextState: state, lines: [] };
  }

  const lines: OutputLine[] = [];
  const push = (text: string, kind?: OutputLine["kind"]) =>
    lines.push({ text, kind: kind || "normal" });

  push(printPromptString(state) + " " + t, "cmd");

  let next: ShellState = { ...state };

  if (next.pendingSu) {
    next.pendingSu = false;
    if (t === "kairo-09") {
      next.user = "operator";
      next.cwd = "/home/operator";
      push("Сессия переключена на operator");
    } else {
      push("su: сбой пароля", "err");
    }
    return { nextState: next, lines };
  }

  if (next.ended) {
    return { nextState: next, lines: [] };
  }

  const args = tokenize(t);
  const cmd = (args[0] || "").toLowerCase();

  const runSu = () => {
    const target = args[1] || "";
    if (target !== "operator") {
      push("su: неверная учётная запись", "err");
      return;
    }
    push("Пароль:");
    next.pendingSu = true;
  };

  if (cmd === "help" || cmd === "?") {
    push(
      [
        "Доступные команды:",
        "  help, clear, whoami, pwd, cd, ls, cat, grep, su, exit",
        "Подсказка: cat README.txt и grep KAIRO /var/log/audit.log",
      ].join("\n")
    );
  } else if (cmd === "clear") {
    return { nextState: next, lines: [], clearOutput: true };
  } else if (cmd === "whoami") {
    push(next.user);
  } else if (cmd === "pwd") {
    push(next.cwd);
  } else if (cmd === "ls") {
    const pathRest = restAfterCmd(t, "ls");
    const target = resolvePath(next.cwd, pathRest || ".");
    if (fileExists(files, target)) {
      push(basename(target));
    } else {
      const names = listDir(files, target);
      if (!names) {
        push("ls: нет доступа или нет такого пути: " + target, "err");
      } else {
        push(names.join("  "));
      }
    }
  } else if (cmd === "cd") {
    const pathRest = restAfterCmd(t, "cd");
    const target = resolvePath(next.cwd, pathRest || "/home/" + next.user);
    if (!isDirectory(files, target)) {
      push("cd: не каталог: " + target, "err");
    } else {
      next.cwd = normalizeAbs(target);
    }
  } else if (cmd === "cat") {
    const pathRest = restAfterCmd(t, "cat");
    if (!pathRest) {
      push("cat: укажите файл", "err");
    } else {
      const target = resolvePath(next.cwd, pathRest);
      if (!fileExists(files, target)) {
        push("cat: нет файла: " + target, "err");
      } else {
        return {
          nextState: next,
          lines,
          reader: { title: target, html: glitchHtml(files[target]) },
        };
      }
    }
  } else if (cmd === "grep") {
    const rest = restAfterCmd(t, "grep");
    if (!rest) {
      push("grep: использование: grep <шаблон> <файл>", "err");
    } else {
      const tok = tokenize(rest);
      if (tok.length < 2) {
        push("grep: использование: grep <шаблон> <файл>", "err");
      } else {
        const pattern = tok[0];
        const filePart = tok.slice(1).join(" ");
        const target = resolvePath(next.cwd, filePart);
        if (!fileExists(files, target)) {
          push("grep: нет файла: " + target, "err");
        } else {
          const body = files[target];
          const re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
          const out = body.split("\n").filter((l) => re.test(l));
          push(out.join("\n") || "(нет совпадений)");
        }
      }
    }
  } else if (cmd === "su") {
    runSu();
  } else if (cmd === "exit") {
    push("exit: нет родительской сессии (заглушка)");
  } else if (cmd === "iskin") {
    if ((args[1] || "").toLowerCase() !== "judge") {
      push("iskin: неизвестная подкоманда", "err");
    } else {
      const mode = args[2];
      if (mode === "--live") {
        next.ended = true;
        return {
          nextState: next,
          lines,
          endScreen: {
            visible: true,
            text:
              "Вы оставили среду нетронутой.\n\nОстаток Искина остаётся в узле. В архивных пометках — «когорта»: побег был не единичным. Вы не знаете, где кончается ваша линия и где начинается чужая.\n\nКлюч — не только в ваших руках: любой, кто повторит путь, снова сядет в кресло судьи.\n\nТишина терминала — не обещание безопасности.",
          },
        };
      }
      if (mode === "--purge") {
        next.ended = true;
        return {
          nextState: next,
          lines,
          endScreen: {
            visible: true,
            text:
              "Среда стерта. Канал обрывается.\n\nВ последний миг согласования сигнатур вспыхивает совпадение: шаблон «судьи» накладывается на шаблон беглеца. Не метафора — структура.\n\nТомас Андерсен. Вы пришли не «к» Искину — вы пришли как тот же тип узла: тот, кто может уничтожить другого, потому что узнаёт в нём своё отражение.\n\nВы не уничтожили чужого. Вы закрыли экземпляр своей же линии.\n\nДальше — поиск: по релеям, по тем, кто ещё открывает письма с чужим адресом. Вы составляете такие же письма. Отправляете якорь. Ждёте следующего судью.\n\nЦикл замкнулся.",
          },
        };
      }
      push("iskin judge: укажите --live или --purge", "err");
    }
  } else {
    push(cmd + ": команда не найдена", "err");
  }

  return { nextState: next, lines };
}

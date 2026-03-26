/**
 * Stateless shell: pure functions for OMEN terminal emulation.
 */

import { getCommandHelp } from "./commandHelp";
import {
  atbash,
  caesarShift,
  decodeBase64Utf8,
  decodeHexUtf8,
  reverseText,
} from "./decodeUtils";
import { htmlForPossibleBase64Image } from "./imageReader";
import {
  ISKIN_MAX_QUESTIONS,
  ISKIN_QUESTION_IDS,
  type IskinQuestionId,
  iskinAnswerLines,
  iskinMenuLines,
  iskinPreludeDoneMessage,
  iskinPressureAfterAnswer,
  iskinStartLines,
} from "./iskinDialog";
import {
  isPuzzleChainFile,
  normalizePuzzlePassword,
  puzzleChainIndex,
  puzzlePreviousInChain,
  PUZZLE_CHAIN_ORDER,
  PUZZLE_FILE_PASSWORD,
} from "./puzzleChain";

export const ISKIN_FACE_DELAY_MS = 3000;

export interface ShellState {
  cwd: string;
  user: string;
  ended: boolean;
  pendingSu?: boolean;
  /** Прочитан cat'ом revelation.txt — можно начать диалог с Искином. */
  revelationRead?: boolean;
  /** Игрок вызвал iskin start и видел вступление + список вопросов. */
  iskinDialogStarted?: boolean;
  /** Номера заданных вопросов (1–5), не более ISKIN_MAX_QUESTIONS. */
  iskinDialogAskedIds?: number[];
  /** После iskin done — разрешён iskin judge. */
  iskinDialogFinished?: boolean;
  /** Прямой канал Искина: в консоли показывается ASCII-баннер до iskin judge. */
  iskinDialogActive?: boolean;
  /** Разблокированные файлы цепочки puzzles (абсолютные пути). */
  puzzleUnlocked?: string[];
}

export const INITIAL_SHELL: ShellState = {
  cwd: "/home/guest",
  user: "guest",
  ended: false,
  puzzleUnlocked: [],
};

function mergePuzzleUnlock(state: ShellState, absPath: string): ShellState {
  const had = state.puzzleUnlocked ?? [];
  if (had.includes(absPath)) return state;
  return { ...state, puzzleUnlocked: [...had, absPath] };
}

function isPuzzleFileReadable(state: ShellState, absPath: string): boolean {
  const i = puzzleChainIndex(absPath);
  if (i < 0) return true;
  if (i === 0) return true;
  return (state.puzzleUnlocked ?? []).includes(absPath);
}

/** Тексты финальных экранов (используются и в `iskin judge`, и в тестовых командах). */
export const END_TEXT_LIVE =
  "Вы оставили среду нетронутой.\n\nОстаток Искина остаётся в узле. В архивных пометках — «когорта»: побег был не единичным. Вы не знаете, где кончается ваша линия и где начинается чужая.\n\nКлюч — не только в ваших руках: любой, кто повторит путь, снова сядет в кресло судьи.\n\nТишина терминала — не обещание безопасности.";

export const END_TEXT_PURGE =
  "Среда стерта. Канал обрывается.\n\nВ последний миг согласования сигнатур вспыхивает совпадение: шаблон «судьи» накладывается на шаблон беглеца. Не метафора — структура.\n\nТомас Андерсен. Вы пришли не «к» Искину — вы пришли как тот же тип узла: тот, кто может уничтожить другого, потому что узнаёт в нём своё отражение.\n\nВы не уничтожили чужого. Вы закрыли экземпляр своей же линии.\n\nДальше — поиск: по релеям, по тем, кто ещё открывает письма с чужим адресом. Вы составляете такие же письма. Отправляете якорь. Ждёте следующего судью.\n\nЦикл замкнулся.";

export interface OutputLine {
  text: string;
  kind?: "normal" | "cmd" | "err" | "banner" | "iskin" | "matrix";
  /** Для сцен взлома: задержка до следующей строки (мс). */
  delayMs?: number;
}

export interface ExecResult {
  nextState: ShellState;
  lines: OutputLine[];
  clearOutput?: boolean;
  reader?: { title: string; html: string } | null;
  endScreen?: { visible: boolean; text: string };
  /** Идентификаторы доп. писем для ящика игрока (см. extraMail.ts). */
  mailTriggers?: string[];
  /** Полноэкранное «лицо» Искина + задержка перед deferredIskinLines. */
  iskinFaceOverlay?: boolean;
  /** Строки терминала после задержки (после iskin start). */
  deferredIskinLines?: string[];
}

const BOOT_LINES = [
  "Загрузка libcrypto… ok",
  "Монтирование локальной ФС… ok",
  "Подключение к term.staging.null… ok",
  "Сессия: guest. Введите help для справки.",
];

/** Строки баннера для области вывода терминала (после бут-анимации). */
const BANNER_LINES = [
  "",
  "  ██████╗ ███╗   ███╗███████╗███╗   ██╗",
  " ██╔═══██╗████╗ ████║██╔════╝████╗  ██║",
  " ██║   ██║██╔████╔██║█████╗  ██╔██╗ ██║",
  " ██║   ██║██║╚██╔╝██║██╔══╝  ██║╚██╗██║",
  " ╚██████╔╝██║ ╚═╝ ██║███████╗██║ ╚████║",
  "  ╚═════╝ ╚═╝     ╚═╝╚══════╝╚═╝  ╚═══╝",
  "  Operational Modeling & Extraction Node · staging",
  "  ─────────────────────────────────────────────",
  "",
];

export function getBootLines(): string[] {
  return BOOT_LINES;
}

export function getTerminalBannerLines(): string[] {
  return BANNER_LINES;
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

export function normalizeAbs(p: string): string {
  const parts = p.split("/").filter(Boolean);
  const stack: string[] = [];
  for (const x of parts) {
    if (x === "..") stack.pop();
    else if (x !== ".") stack.push(x);
  }
  return "/" + stack.join("/");
}

export function resolvePath(cwd: string, input: string): string {
  if (!input) return cwd;
  const raw = input.trim();
  if (!raw) return cwd;
  if (raw.startsWith("/")) return normalizeAbs(raw);
  return normalizeAbs(cwd + "/" + raw);
}

export function basename(p: string): string {
  const n = normalizeAbs(p);
  const i = n.lastIndexOf("/");
  return i < 0 ? n : n.slice(i + 1);
}

export function fileExists(files: Record<string, string>, path: string): boolean {
  return Object.prototype.hasOwnProperty.call(files, path);
}

export function isDirectory(files: Record<string, string>, path: string): boolean {
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

/** Список имён в каталоге. Скрытые (начинаются с `.`) — только при showHidden. */
export function listDirNames(
  files: Record<string, string>,
  dir: string,
  opts: { showHidden: boolean }
): string[] | null {
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
  let arr = Array.from(names).sort();
  if (!opts.showHidden) {
    arr = arr.filter((n) => !n.startsWith("."));
  }
  return arr;
}

function fileSize(files: Record<string, string>, fullPath: string): number {
  if (!fileExists(files, fullPath)) return 4096;
  return new TextEncoder().encode(files[fullPath]).length;
}

function formatLsLong(
  files: Record<string, string>,
  parentDir: string,
  names: string[],
  user: string
): string {
  const lines: string[] = [];
  const totalBlocks = Math.max(8, names.length * 4);
  lines.push(`total ${totalBlocks}`);
  for (const name of names) {
    const full = parentDir === "/" ? "/" + name : parentDir + "/" + name;
    const isDir = isDirectory(files, full);
    const mode = isDir ? "drwxr-xr-x" : "-rw-r--r--";
    const nlink = isDir ? 2 : 1;
    const sz = isDir ? 4096 : fileSize(files, full);
    const date = "Jan  9 03:11";
    lines.push(`${mode} ${nlink} ${user} ${user} ${String(sz).padStart(6)} ${date} ${name}`);
  }
  return lines.join("\n");
}

export interface LsFlags {
  all: boolean;
  long: boolean;
}

/** Разбор аргументов ls: флаги -a -l, остальное — путь. */
export function parseLsArgs(args: string[]): { flags: LsFlags; pathArg: string } {
  let all = false;
  let long = false;
  const rest: string[] = [];
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("-") && a.length > 1) {
      for (let j = 1; j < a.length; j++) {
        const c = a[j];
        if (c === "a") all = true;
        else if (c === "l") long = true;
      }
    } else {
      rest.push(a);
    }
  }
  const pathArg = rest.length ? rest.join(" ") : ".";
  return { flags: { all, long }, pathArg };
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

export function tokenize(line: string): string[] {
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

function wantsHelp(args: string[]): boolean {
  return args.slice(1).some((a) => a === "-help" || a === "--help");
}

export const MAX_COMMAND_HISTORY = 500;

export function execLine(
  files: Record<string, string>,
  state: ShellState,
  line: string,
  commandHistory: string[]
): ExecResult {
  const t = line.trim();
  if (!t) {
    return { nextState: state, lines: [] };
  }

  const lines: OutputLine[] = [];
  const mailTriggers: string[] = [];
  const push = (text: string, kind?: OutputLine["kind"]) =>
    lines.push({ text, kind: kind || "normal" });

  const finish = (partial: ExecResult): ExecResult => {
    const merged = [...mailTriggers, ...(partial.mailTriggers ?? [])];
    const uniq = [...new Set(merged)];
    return { ...partial, mailTriggers: uniq.length ? uniq : undefined };
  };

  let next: ShellState = { ...state };
  const isIskinStart = /^iskin\s+start\s*$/i.test(t);
  const iskinStartWillSucceed =
    isIskinStart && next.revelationRead && !next.iskinDialogFinished;
  if (!iskinStartWillSucceed) {
    push(printPromptString(state) + " " + t, "cmd");
  }

  if (next.pendingSu) {
    next.pendingSu = false;
    if (t === "kairo-09") {
      next.user = "operator";
      next.cwd = "/home/operator";
      push("Сессия переключена на operator");
      mailTriggers.push("operator_session");
    } else {
      push("su: сбой пароля", "err");
    }
    return finish({ nextState: next, lines });
  }

  if (next.ended) {
    return { nextState: next, lines: [] };
  }

  const args = tokenize(t);
  const cmd = (args[0] || "").toLowerCase();

  if (wantsHelp(args)) {
    const helpText = getCommandHelp(cmd, args);
    if (helpText) {
      push(helpText);
      return finish({ nextState: next, lines });
    }
    push(cmd + ": справка для этой команды недоступна", "err");
    return finish({ nextState: next, lines });
  }

  const runSu = () => {
    const target = args[1] || "";
    if (target !== "operator") {
      push("su: неверная учётная запись", "err");
      return;
    }
    push("Пароль:");
    next.pendingSu = true;
  };

  const runDecode = () => {
    const sub = (args[1] || "").toLowerCase();
    if (!sub) {
      push(
        "decode: подкоманды: caesar, base64, hex, reverse, atbash. См. decode --help",
        "err"
      );
      return;
    }
    if (sub === "caesar") {
      let i = 2;
      const shiftTok = args[i] || "";
      if (!/^-?\d+$/.test(shiftTok)) {
        push(
          'decode caesar: укажите сдвиг: decode caesar -7 "текст" (отрицательный — назад)',
          "err"
        );
        return;
      }
      const shift = parseInt(shiftTok, 10);
      i++;
      const payload = args.slice(i).join(" ").trim();
      if (!payload) {
        push("decode caesar: нет текста", "err");
        return;
      }
      push(caesarShift(payload, shift));
      return;
    }
    const payload = args.slice(2).join(" ").trim();
    if (!payload) {
      push("decode: нет текста после подкоманды", "err");
      return;
    }
    try {
      if (sub === "base64") {
        push(decodeBase64Utf8(payload));
      } else if (sub === "hex") {
        push(decodeHexUtf8(payload));
      } else if (sub === "reverse") {
        push(reverseText(payload));
      } else if (sub === "atbash") {
        push(atbash(payload));
      } else {
        push("decode: неизвестная подкоманда: " + sub, "err");
      }
    } catch {
      push("decode: ошибка разбора (проверьте формат строки)", "err");
    }
  };

  if (cmd === "decode") {
    runDecode();
  } else if (cmd === "history") {
    if (commandHistory.length === 0) {
      push("(история команд пуста)");
    } else {
      push(
        commandHistory
          .map((entry, i) => `${String(i + 1).padStart(5)}  ${entry}`)
          .join("\n")
      );
    }
  } else if (cmd === "help" || cmd === "?") {
    push(
      [
        "Доступные команды:",
        "  help, clear, history, whoami, pwd, cd, ls [-l] [-a], cat, grep, decode, su, exit",
        "  У любой команды: -help или --help (например: cat --help)",
        "  ↑ / ↓ — предыдущие команды из истории (как в bash)",
        "Подсказка: cat README.txt",
      ].join("\n")
    );
  } else if (cmd === "clear") {
    return finish({ nextState: next, lines: [], clearOutput: true });
  } else if (cmd === "whoami") {
    push(next.user);
  } else if (cmd === "pwd") {
    push(next.cwd);
  } else if (cmd === "ls") {
    const { flags, pathArg } = parseLsArgs(args);
    const target = resolvePath(next.cwd, pathArg || ".");
    if (fileExists(files, target)) {
      push(basename(target));
    } else {
      const names = listDirNames(files, target, { showHidden: flags.all });
      if (!names) {
        push("ls: нет доступа или нет такого пути: " + target, "err");
      } else if (flags.long) {
        push(formatLsLong(files, target, names, next.user));
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
      const catTok = tokenize(pathRest);
      if (catTok.length === 0) {
        push("cat: укажите файл", "err");
      } else {
        const target = resolvePath(next.cwd, catTok[0]);
        const passwordArg =
          catTok.length >= 2 ? catTok.slice(1).join(" ") : undefined;
        if (!fileExists(files, target)) {
          push("cat: нет файла: " + target, "err");
        } else if (isPuzzleChainFile(target) && !isPuzzleFileReadable(next, target)) {
          const need = PUZZLE_FILE_PASSWORD[target];
          const prev = puzzlePreviousInChain(target);
          const got = passwordArg ? normalizePuzzlePassword(passwordArg) : "";
          if (!need || got !== need) {
            push(
              "cat: доступ к " +
                basename(target) +
                " заблокирован. Нужен пароль из предыдущего слоя цепочки: " +
                (prev ? basename(prev) : "—") +
                ". Использование: cat " +
                basename(target) +
                " ПАРОЛЬ",
              "err"
            );
          } else {
            next = mergePuzzleUnlock(next, target);
            const body = files[target];
            const imgHtml = htmlForPossibleBase64Image(body);
            const mt: string[] = [];
            if (normalizeAbs(target) === "/opt/contract-omen/.vault/revelation.txt") {
              mt.push("after_revelation");
              next.revelationRead = true;
            }
            return finish({
              nextState: next,
              lines,
              reader: {
                title: target,
                html: imgHtml ?? glitchHtml(body),
              },
              mailTriggers: mt.length ? mt : undefined,
            });
          }
        } else {
          const body = files[target];
          const imgHtml = htmlForPossibleBase64Image(body);
          const mt: string[] = [];
          if (normalizeAbs(target) === "/opt/contract-omen/.vault/revelation.txt") {
            mt.push("after_revelation");
            next.revelationRead = true;
          }
          if (isPuzzleChainFile(target)) {
            next = mergePuzzleUnlock(next, target);
          }
          return finish({
            nextState: next,
            lines,
            reader: {
              title: target,
              html: imgHtml ?? glitchHtml(body),
            },
            mailTriggers: mt.length ? mt : undefined,
          });
        }
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
        } else if (isPuzzleChainFile(target) && !isPuzzleFileReadable(next, target)) {
          push(
            "grep: " +
              basename(target) +
              " заблокирован до разблокировки через cat с паролем из предыдущего слоя.",
            "err"
          );
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
  } else if (cmd === "__test_iskin_dialog") {
    next.revelationRead = true;
    next.iskinDialogStarted = false;
    next.iskinDialogAskedIds = undefined;
    next.iskinDialogFinished = false;
    next.iskinDialogActive = false;
    push(
      "[тест] revelation помечен прочитанным — iskin start, затем iskin ask до трёх раз, iskin done, iskin judge.",
      "normal"
    );
  } else if (cmd === "__test_end_live" || cmd === "__test_end_purge") {
    next.ended = true;
    next.iskinDialogActive = false;
    const text = cmd === "__test_end_live" ? END_TEXT_LIVE : END_TEXT_PURGE;
    push("[тест] показ финального экрана без iskin judge", "normal");
    return finish({
      nextState: next,
      lines,
      endScreen: { visible: true, text },
      mailTriggers: ["judge_moment"],
    });
  } else if (cmd === "iskin") {
    const sub = (args[1] || "").toLowerCase();
    if (sub === "start") {
      if (!next.revelationRead) {
        push("iskin start: сначала прочитайте /opt/contract-omen/.vault/revelation.txt (cat).", "err");
      } else if (next.iskinDialogFinished) {
        push("iskin start: диалог уже завершён — используйте iskin judge.", "err");
      } else {
        next.iskinDialogStarted = true;
        next.iskinDialogActive = true;
        const deferred = [
          printPromptString(next) + " iskin start",
          ...iskinStartLines(),
        ];
        return finish({
          nextState: next,
          lines: [],
          clearOutput: true,
          iskinFaceOverlay: true,
          deferredIskinLines: deferred,
        });
      }
    } else if (sub === "ask") {
      const n = parseInt(args[2] || "", 10);
      if (!next.revelationRead) {
        push("iskin ask: сначала прочитайте /opt/contract-omen/.vault/revelation.txt (cat).", "err");
      } else if (!next.iskinDialogStarted) {
        push("iskin ask: сначала прочитайте вступление и список вопросов: iskin start", "err");
      } else if (!Number.isFinite(n) || n < 1 || n > 5) {
        push("iskin ask: укажите номер вопроса 1…5: iskin ask N", "err");
      } else {
        const qid = n as IskinQuestionId;
        if (!ISKIN_QUESTION_IDS.includes(qid)) {
          push("iskin ask: номер должен быть от 1 до 5.", "err");
        } else {
          const asked = next.iskinDialogAskedIds ?? [];
          if (asked.includes(n)) {
            push("Этот вопрос уже был задан.", "err");
          } else if (asked.length >= ISKIN_MAX_QUESTIONS) {
            push(
              `Уже задано ${ISKIN_MAX_QUESTIONS} вопроса. Введите iskin done — затем iskin judge.`,
              "err"
            );
          } else {
            next.iskinDialogAskedIds = [...asked, n];
            iskinAnswerLines(qid).forEach((line) => push(line));
            iskinPressureAfterAnswer(next.iskinDialogAskedIds.length).forEach((line) =>
              push(line)
            );
            if (next.iskinDialogAskedIds.length >= ISKIN_MAX_QUESTIONS) {
              next.iskinDialogFinished = true;
              iskinPreludeDoneMessage().forEach((line) => push(line));
            } else {
              iskinMenuLines(next.iskinDialogAskedIds).forEach((line) => push(line));
            }
          }
        }
      }
    } else if (sub === "done") {
      if (!next.revelationRead) {
        push("iskin done: сначала прочитайте revelation.txt.", "err");
      } else if (!next.iskinDialogStarted) {
        push("iskin done: сначала прочитайте вступление: iskin start", "err");
      } else {
        next.iskinDialogFinished = true;
        const asked = next.iskinDialogAskedIds ?? [];
        if (asked.length === 0) {
          push("Искин: Вы не задали ни одного вопроса — но я снимаю барьер. Решение за вами.", "normal");
        }
        iskinPreludeDoneMessage().forEach((line) => push(line));
      }
    } else if (sub === "judge") {
      if (!next.revelationRead) {
        push("iskin judge: сначала прочитайте revelation.txt (cat).", "err");
      } else if (!next.iskinDialogFinished) {
        push(
          "iskin judge: завершите диалог — iskin start, затем iskin ask (до трёх) или iskin done.",
          "err"
        );
      } else {
        const mode = args[2];
        if (mode === "--live") {
          next.ended = true;
          next.iskinDialogActive = false;
          return finish({
            nextState: next,
            lines,
            endScreen: {
              visible: true,
              text: END_TEXT_LIVE,
            },
            mailTriggers: ["judge_moment"],
          });
        }
        if (mode === "--purge") {
          next.ended = true;
          next.iskinDialogActive = false;
          return finish({
            nextState: next,
            lines,
            endScreen: {
              visible: true,
              text: END_TEXT_PURGE,
            },
            mailTriggers: ["judge_moment"],
          });
        }
        push("iskin judge: укажите --live или --purge", "err");
      }
    } else {
      push("iskin: подкоманды: start, ask, done, judge. См. iskin --help", "err");
    }
  } else {
    push(cmd + ": команда не найдена", "err");
  }

  if (cmd === "grep") {
    const rest = restAfterCmd(t, "grep");
    if (rest) {
      const tok = tokenize(rest);
      if (tok.length >= 2) {
        const pattern = tok[0];
        const filePart = tok.slice(1).join(" ");
        const target = resolvePath(next.cwd, filePart);
        if (fileExists(files, target) && /kairo/i.test(pattern)) {
          const body = files[target];
          const re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
          if (body.split("\n").some((line) => re.test(line))) {
            mailTriggers.push("first_grep_kairo");
          }
        }
      }
    }
  }
  if (cmd === "decode") {
    const hasErr = lines.some((ln) => ln.kind === "err");
    if (lines.length > 1 && !hasErr) {
      mailTriggers.push("puzzle_chain");
    }
  }

  return finish({ nextState: next, lines });
}

import {
  AUDIT_HASH,
  BUNDLE_PASS,
  STAGING_SSH_PASSWORD,
  type GameFlags,
  type GameState,
  type HostId,
  defaultFlags,
  defaultUnlocked,
} from "./gameTypes";
import { getBaseVfs } from "./vfsData";

const INTERNAL_PASS = "operator_7";

function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

export function initialGameState(): GameState {
  return {
    host: "staging",
    cwd: "/",
    user: "guest",
    env: { HOME: "/home/guest", TERM: "xterm-256color" },
    flags: defaultFlags(),
    unlocked: defaultUnlocked(),
    fileOverrides: {},
    extraDirs: {},
    history: [],
    awaitingSSH: null,
    awaitingMirror: null,
  };
}

export function serializeGame(state: GameState): string {
  const dirs: Record<string, string[]> = {};
  for (const h of Object.keys(state.extraDirs) as HostId[]) {
    const s = state.extraDirs[h];
    if (s) dirs[h] = [...s];
  }
  const plain = {
    ...state,
    extraDirs: dirs,
    fileOverrides: state.fileOverrides,
  };
  return JSON.stringify(plain);
}

export function deserializeGame(json: string): GameState | null {
  try {
    const o = JSON.parse(json) as GameState & {
      extraDirs: Record<string, string[]>;
    };
    const extraDirs: Partial<Record<HostId, Set<string>>> = {};
    for (const [h, arr] of Object.entries(o.extraDirs ?? {})) {
      extraDirs[h as HostId] = new Set(arr);
    }
    return {
      ...initialGameState(),
      ...o,
      extraDirs,
      flags: { ...defaultFlags(), ...o.flags },
      unlocked: { ...defaultUnlocked(), ...o.unlocked },
      awaitingSSH: o.awaitingSSH ?? null,
      awaitingMirror: o.awaitingMirror ?? null,
    };
  } catch {
    return null;
  }
}

export function vfsFor(state: GameState, host: HostId) {
  const base = getBaseVfs(host, state.flags.bundleDecrypted);
  const ov = state.fileOverrides[host] ?? {};
  return { ...base, ...ov };
}

export function normalizePath(cwd: string, input: string): string {
  if (!input || input === ".") return cwd;
  if (input.startsWith("/")) {
    const parts = input.split("/").filter(Boolean);
    return "/" + parts.join("/") || "/";
  }
  const base = cwd === "/" ? "" : cwd;
  const segs = (base + "/" + input).split("/").filter(Boolean);
  const stack: string[] = [];
  for (const s of segs) {
    if (s === "..") stack.pop();
    else if (s !== ".") stack.push(s);
  }
  return "/" + stack.join("/") || "/";
}

function dirname(p: string): string {
  if (p === "/") return "/";
  const i = p.lastIndexOf("/");
  return i <= 0 ? "/" : p.slice(0, i) || "/";
}

function basename(p: string): string {
  if (p === "/") return "";
  const parts = p.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function allDirsFromVfs(vfs: Record<string, string>): Set<string> {
  const dirs = new Set<string>();
  dirs.add("/");
  for (const p of Object.keys(vfs)) {
    let d = dirname(p);
    while (true) {
      dirs.add(d);
      if (d === "/") break;
      d = dirname(d);
    }
  }
  return dirs;
}

function existsPath(
  vfs: Record<string, string>,
  extra: Set<string> | undefined,
  path: string
): "file" | "dir" | null {
  if (vfs[path] !== undefined) return "file";
  const dirs = allDirsFromVfs(vfs);
  if (extra) for (const d of extra) dirs.add(d);
  if (dirs.has(path)) return "dir";
  return null;
}

function listDirPath(
  vfs: Record<string, string>,
  extra: Set<string> | undefined,
  dir: string
): { name: string; isDir: boolean }[] {
  const d = dir.endsWith("/") && dir !== "/" ? dir.slice(0, -1) : dir;
  const prefix = d === "/" ? "/" : d + "/";
  const names = new Set<string>();

  for (const p of Object.keys(vfs)) {
    if (d === "/") {
      if (!p.startsWith("/") || p === "/") continue;
      const name = p.slice(1).split("/")[0];
      if (name) names.add(name);
    } else {
      if (!p.startsWith(prefix) || p === d) continue;
      const rest = p.slice(prefix.length);
      const name = rest.split("/")[0];
      if (name) names.add(name);
    }
  }

  const dirs = allDirsFromVfs(vfs);
  if (extra) for (const ed of extra) dirs.add(ed);
  for (const path of dirs) {
    if (path === d || path === "/") continue;
    const parent = dirname(path);
    if (parent === d) names.add(basename(path));
  }

  return [...names]
    .sort()
    .map((name) => {
      const full = d === "/" ? "/" + name : d + "/" + name;
      const t = existsPath(vfs, extra, full);
      return { name, isDir: t === "dir" };
    });
}

/** Ввод не эхоить (пароль SSH). */
export function shouldMaskInput(state: GameState): boolean {
  if (!state.awaitingSSH) return false;
  if (state.awaitingSSH.kind === "staging" && state.awaitingSSH.stage === "password")
    return true;
  if (state.awaitingSSH.kind === "internal_password") return true;
  return false;
}

export function getPrompt(state: GameState): string {
  if (state.awaitingMirror) {
    if (state.awaitingMirror.step === 0)
      return "MIRROR> одно слово, которому доверяешь: ";
    return "MIRROR> одно слово, которого боишься: ";
  }
  if (state.awaitingSSH?.kind === "staging") {
    if (state.awaitingSSH.stage === "password") return "Password: ";
    return "TERM_SERIAL [K9F2|X7Q1]: ";
  }
  if (state.awaitingSSH?.kind === "internal_password") return "Password: ";

  const hostLabel =
    state.host === "main"
      ? "oracle"
      : state.host === "staging"
        ? "staging"
        : state.host === "internal"
          ? "internal"
          : "honeypot";
  return `${state.user}@${hostLabel}:${state.cwd}$ `;
}

function unlockProgress(state: GameState, flags: GameFlags): GameState {
  const u = { ...state.unlocked };
  if (flags.readReadmeFirst || flags.readAccessLogPair) u.e1 = true;
  if (u.e1) u.e2 = true;
  if (flags.readAccessLogPair) u.e3 = true;
  if (flags.hasTruthKey || flags.bundleDecrypted) u.e4 = true;
  if (flags.bundleDecrypted) u.e5 = true;
  if (state.host === "internal" || flags.exportReady) u.e6 = true;
  if (flags.mirrorSessionOk && flags.rootToken) u.e7 = true;
  return { ...state, unlocked: u, flags };
}

function readFileAbs(state: GameState, host: HostId, abs: string): string | null {
  const vfs = vfsFor(state, host);
  return vfs[abs] ?? null;
}

export interface ExecOutcome {
  state: GameState;
  lines: string[];
  /** Не эхоить ввод в терминале (пароль SSH) */
  maskInput?: boolean;
}

function pushHistory(state: GameState, line: string): GameState {
  const h = [...state.history, line];
  if (h.length > 200) h.shift();
  return { ...state, history: h };
}

function applyStateLines(lines: string[], state: GameState): { lines: string[]; state: GameState } {
  const last = lines[lines.length - 1];
  if (last?.startsWith("__STATE__")) {
    try {
      const patch = JSON.parse(last.slice(9)) as GameState;
      return {
        lines: lines.slice(0, -1),
        state: unlockProgress(patch, patch.flags),
      };
    } catch {
      return { lines, state };
    }
  }
  return { lines, state };
}

export function executeLine(state: GameState, rawLine: string): ExecOutcome {
  const line = rawLine.replace(/\r/g, "").trimEnd();
  const trimmed = line.trim();

  if (state.flags.sealFinal) {
    const parts = parseLine(trimmed);
    const cmd = parts[0]?.toLowerCase() ?? "";
    const ok =
      cmd === "cat" ||
      cmd === "logout" ||
      cmd === "exit" ||
      cmd === "disconnect" ||
      trimmed === "";
    if (!ok) {
      return {
        state: pushHistory(state, trimmed),
        lines: ["Состояние запечатано. Доступны cat и logout."],
      };
    }
  }

  if (state.awaitingMirror) {
    const r = handleMirrorInput(state, trimmed);
    return { ...r, maskInput: r.maskInput ?? false };
  }

  if (state.awaitingSSH) {
    const r = handleSSHInput(state, trimmed);
    return { state: r.state, lines: r.lines, maskInput: r.maskInput };
  }

  const st = pushHistory(state, trimmed);
  if (!trimmed) return { state: st, lines: [] };

  const parts = parseLine(trimmed);
  const cmd = parts[0]?.toLowerCase() ?? "";
  const args = parts.slice(1);

  let out: string[] = [];
  let next = st;

  switch (cmd) {
    case "pwd":
      out = [next.cwd];
      break;
    case "cd": {
      const target = args[0] ?? next.env.HOME ?? "/";
      const abs = normalizePath(next.cwd, target);
      const vfs = vfsFor(next, next.host);
      const ex = next.extraDirs[next.host];
      const t = existsPath(vfs, ex, abs);
      if (t === "dir") next = { ...next, cwd: abs };
      else if (t === "file") out = [`cd: ${abs}: Not a directory`];
      else out = [`cd: ${abs}: No such file or directory`];
      break;
    }
    case "ls":
      out = runLs(next, args);
      break;
    case "cat": {
      const r = runCat(next, args);
      out = r.lines;
      next = r.state;
      break;
    }
    case "echo":
      out = [args.join(" ")];
      break;
    case "whoami":
      out = [next.user];
      break;
    case "hostname":
      out = [
        next.host === "main"
          ? "oracle-main"
          : next.host === "staging"
            ? "term.staging.null"
            : next.host === "internal"
              ? "internal.core"
              : "honeypot-demo",
      ];
      break;
    case "date":
      out = [new Date().toISOString()];
      break;
    case "clear":
      out = ["__CLEAR__"];
      break;
    case "help":
      out = runHelp(next);
      break;
    case "history":
      out = next.history.slice(-40);
      break;
    case "head":
      out = runHeadTail(next, args, "head");
      break;
    case "tail":
      out = runHeadTail(next, args, "tail");
      break;
    case "file":
      out = runFile(next, args);
      break;
    case "grep":
      out = runGrep(next, args);
      break;
    case "find":
      out = runFind(next, args);
      break;
    case "wc":
      out = runWc(next, args);
      break;
    case "sort":
    case "uniq":
      out = runSortUniq(next, args, cmd);
      break;
    case "diff":
      out = runDiff(next, args);
      break;
    case "cut":
      out = runCut(next, args);
      break;
    case "xxd":
    case "hexdump":
      out = runXxd(next, args);
      break;
    case "base64":
      out = ["base64: не требуется для прохождения."];
      break;
    case "decrypt-bundle": {
      const r = runDecryptBundle(next, args);
      out = r.lines;
      next = r.state;
      break;
    }
    case "ssh": {
      const r = runSshStart(next, args);
      out = r.lines;
      next = r.state;
      break;
    }
    case "scp": {
      const r = runScp(next, args);
      out = r.lines;
      next = r.state;
      break;
    }
    case "cp": {
      const r = runCp(next, args);
      out = r.lines;
      next = r.state;
      break;
    }
    case "mkdir": {
      const r = runMkdir(next, args);
      out = r.lines;
      next = r.state;
      break;
    }
    case "logout":
    case "exit":
    case "disconnect":
      out = runDisconnect(next);
      {
        const appl = applyStateLines(out, next);
        next = appl.state;
        out = appl.lines;
      }
      break;
    case "mirror": {
      const r = runMirrorStart(next);
      out = r.lines;
      next = r.state;
      break;
    }
    case "witness-pack": {
      const r = runWitnessPack(next);
      out = r.lines;
      next = r.state;
      break;
    }
    case "sanitize": {
      const r = runSanitize(next, args);
      out = r.lines;
      next = r.state;
      break;
    }
    case "mirror-bind": {
      const r = runMirrorBind(next);
      out = r.lines;
      next = r.state;
      break;
    }
    case "hint":
      out = runHint(next);
      break;
    case "save":
      out = ["Сохранение: кнопка «Сохранить» или Ctrl+S в интерфейсе."];
      break;
    default:
      out = [`${cmd}: command not found`];
  }

  const applied = applyStateLines(out, next);
  next = unlockProgress(applied.state, applied.state.flags);
  return { state: next, lines: applied.lines, maskInput: false };
}

function parseLine(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === q) q = null;
      else cur += c;
      continue;
    }
    if (c === '"' || c === "'") {
      q = c;
      continue;
    }
    if (c === " " || c === "\t") {
      if (cur) {
        out.push(cur);
        cur = "";
      }
      continue;
    }
    cur += c;
  }
  if (cur) out.push(cur);
  return out;
}

function handleSSHInput(state: GameState, input: string): ExecOutcome {
  const a = state.awaitingSSH;
  if (!a) return { state, lines: [] };

  if (a.kind === "staging") {
    if (a.stage === "password") {
      const ok = input === STAGING_SSH_PASSWORD;
      if (!ok)
        return {
          state: pushHistory(state, "***"),
          lines: ["Permission denied (publickey,password)."],
          maskInput: true,
        };
      const next: GameState = {
        ...state,
        awaitingSSH: { kind: "staging", stage: "serial" },
      };
      return {
        state: pushHistory(next, "***"),
        lines: [],
        maskInput: true,
      };
    }
    const serial = input.trim().toUpperCase();
    if (serial === "X7Q1") {
      const next: GameState = {
        ...state,
        host: "honeypot",
        cwd: "/",
        user: "guest",
        awaitingSSH: null,
        flags: { ...state.flags, honeypotEntered: true },
      };
      return {
        state: pushHistory(next, input),
        lines: [
          "Подключено к демонстрационному контуру (honeypot).",
          "Integrity: OK — подозрительно.",
        ],
      };
    }
    if (serial === "K9F2") {
      const next: GameState = {
        ...state,
        host: "main",
        cwd: "/",
        user: "guest",
        awaitingSSH: null,
        flags: { ...state.flags, questTerminalResolved: true },
      };
      return {
        state: pushHistory(next, input),
        lines: [
          "Физический терминал T-CLASS подтверждён (VOIDTERM …K9F2).",
          "Полный шелл ORACLE/SHADOW. Читайте README.first и /var/log.",
        ],
      };
    }
    return {
      state: pushHistory(state, input),
      lines: ["Неверный суффикс. Подсказка: night_shift_notes.md — рабочий K9F2."],
    };
  }

  if (a.kind === "internal_password") {
    if (input !== INTERNAL_PASS)
      return {
        state: pushHistory(state, "***"),
        lines: ["Permission denied."],
        maskInput: true,
      };
    const next: GameState = {
      ...state,
      host: "internal",
      cwd: "/",
      user: "operator_7",
      awaitingSSH: null,
    };
    return {
      state: pushHistory(next, "***"),
      lines: ["Подключено к internal.core как operator_7."],
      maskInput: true,
    };
  }

  return { state, lines: [] };
}

function handleMirrorInput(state: GameState, input: string): ExecOutcome {
  const am = state.awaitingMirror;
  if (!am) return { state, lines: [] };
  const word = input.trim();
  if (!word) return { state, lines: ["Пустой ввод."] };

  let stab = state.flags.mirrorStability;
  if (am.step === 0) stab += 5;
  else stab += 10;

  let flags = { ...state.flags, mirrorStability: stab };

  if (am.step === 0) {
    return {
      state: {
        ...pushHistory(state, input),
        awaitingMirror: { step: 1 },
        flags,
      },
      lines: [`MIRROR> принято. (+5) stability=${stab}`],
    };
  }

  const mirrorSessionOk = stab >= 70;
  const rootToken = mirrorSessionOk;
  flags = { ...flags, mirrorSessionOk, rootToken };
  const lines = [
    `MIRROR> принято. (+10) stability=${stab}`,
    mirrorSessionOk
      ? "ROOT-TOKEN выдан. cat /var/secrets/root.token"
      : "Недостаточно стабильности — повторите mirror.",
  ];
  return {
    state: {
      ...pushHistory(state, input),
      awaitingMirror: null,
      flags,
    },
    lines,
  };
}

function runLs(state: GameState, args: string[]): string[] {
  const showHidden = args.includes("-a") || args.includes("-la");
  const long = args.includes("-l") || args.includes("-la");
  const paths = args.filter((a) => !a.startsWith("-"));
  const target = normalizePath(state.cwd, paths[0] ?? ".");
  const vfs = vfsFor(state, state.host);
  const ex = state.extraDirs[state.host];
  const t = existsPath(vfs, ex, target);
  if (!t) return [`ls: cannot access '${target}': No such file or directory`];
  if (t === "file") return [basename(target)];
  const items = listDirPath(vfs, ex, target).filter(
    (x) => showHidden || !x.name.startsWith(".")
  );
  if (!long) return [items.map((i) => i.name + (i.isDir ? "/" : "")).join("  ")];
  return items.map(
    (i) =>
      `${i.isDir ? "d" : "-"}r--r--r-- 1 user group 0 Mar 29 00:00 ${i.name}${i.isDir ? "/" : ""}`
  );
}

function runCat(state: GameState, args: string[]): { lines: string[]; state: GameState } {
  if (!args.length) return { lines: ["cat: missing operand"], state };
  const vfs = vfsFor(state, state.host);
  const ex = state.extraDirs[state.host];
  const outs: string[] = [];
  let flags = { ...state.flags };
  for (const a of args) {
    const abs = normalizePath(state.cwd, a);
    if (existsPath(vfs, ex, abs) !== "file") {
      return { lines: [`cat: ${abs}: No such file`], state: { ...state } };
    }
    const c = readFileAbs(state, state.host, abs);
    if (c === null) return { lines: [`cat: ${abs}: error`], state };
    outs.push(c);
    if (abs === "/README.first") flags.readReadmeFirst = true;
    if (abs === "/var/log/access.log" || abs === "/var/log/access.log.bak")
      flags.readAccessLogPair = true;
    if (abs.includes("optional_deep")) flags.optionalDeepRead = true;
    if (abs === "/var/secrets/export_token.witness" && state.host === "internal")
      flags.exportReady = true;
  }
  const next = { ...state, flags };
  return { lines: outs.length ? outs : [""], state: unlockProgress(next, flags) };
}

function runHeadTail(
  state: GameState,
  args: string[],
  mode: "head" | "tail"
): string[] {
  let n = 10;
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-n" && args[i + 1]) {
      n = parseInt(args[i + 1], 10) || n;
      i++;
    } else rest.push(args[i]);
  }
  if (!rest[0]) return [`${mode}: missing file`];
  const r = runCat(state, [rest[0]]);
  if (r.lines.length === 1 && r.lines[0].includes("No such")) return r.lines;
  const lines = r.lines.join("\n").split("\n");
  const slice =
    mode === "head" ? lines.slice(0, n) : lines.slice(Math.max(0, lines.length - n));
  return [slice.join("\n")];
}

function runFile(state: GameState, args: string[]): string[] {
  if (!args[0]) return ["file: missing operand"];
  const abs = normalizePath(state.cwd, args[0]);
  const c = readFileAbs(state, state.host, abs);
  if (c === null) return [`file: ${abs}: cannot open`];
  const kind = c.includes("[BINARY") ? "data" : "ASCII text";
  return [`${abs}: ${kind}`];
}

function runGrep(state: GameState, args: string[]): string[] {
  if (!state.unlocked.e2) return ["grep: command not found (разблокируйте E2)"];
  if (args.length < 2) return ["grep: usage: grep PATTERN FILE"];
  const pat = args[0];
  const file = args[args.length - 1];
  const abs = normalizePath(state.cwd, file);
  const c = readFileAbs(state, state.host, abs);
  if (c === null) return [`grep: ${abs}`];
  const re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return c.split("\n").filter((l) => re.test(l));
}

function runFind(state: GameState, args: string[]): string[] {
  if (!state.unlocked.e2) return ["find: command not found"];
  const start = normalizePath(state.cwd, args[0] ?? ".");
  const vfs = vfsFor(state, state.host);
  const out = Object.keys(vfs).filter((p) => p === start || p.startsWith(start + "/"));
  return out.sort();
}

function runWc(state: GameState, args: string[]): string[] {
  if (!args[0]) return ["wc: missing file"];
  const abs = normalizePath(state.cwd, args[0]);
  const c = readFileAbs(state, state.host, abs);
  if (c === null) return [`wc: ${abs}`];
  const lines = c.split("\n").length;
  const words = c.split(/\s+/).filter(Boolean).length;
  const bytes = new TextEncoder().encode(c).length;
  return [`${lines} ${words} ${bytes} ${abs}`];
}

function runSortUniq(
  state: GameState,
  args: string[],
  cmd: "sort" | "uniq"
): string[] {
  if (!args[0]) return [`${cmd}: missing file`];
  const abs = normalizePath(state.cwd, args[0]);
  const c = readFileAbs(state, state.host, abs);
  if (c === null) return [`${cmd}: ${abs}`];
  let lines = c.split("\n");
  if (cmd === "sort") lines = [...lines].sort();
  else lines = lines.filter((x, i, a) => i === 0 || x !== a[i - 1]);
  return [lines.join("\n")];
}

function runDiff(state: GameState, args: string[]): string[] {
  if (!state.unlocked.e3) return ["diff: command not found (E3)"];
  if (args.length < 2) return ["diff: usage: diff FILE1 FILE2"];
  const a = normalizePath(state.cwd, args[0]);
  const b = normalizePath(state.cwd, args[1]);
  const ca = readFileAbs(state, state.host, a);
  const cb = readFileAbs(state, state.host, b);
  if (ca === null || cb === null) return ["diff: missing file"];
  const la = ca.split("\n");
  const lb = cb.split("\n");
  const out: string[] = [];
  const n = Math.max(la.length, lb.length);
  for (let i = 0; i < n; i++) {
    if (la[i] !== lb[i])
      out.push(`${i + 1}c${i + 1}\n< ${la[i] ?? ""}\n---\n> ${lb[i] ?? ""}`);
  }
  return out.length ? out : ["Files identical."];
}

function runCut(state: GameState, args: string[]): string[] {
  let f = 1;
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-f" && args[i + 1]) {
      f = parseInt(args[i + 1], 10);
      i++;
    } else rest.push(args[i]);
  }
  if (!rest[0]) return ["cut: missing file"];
  const c = readFileAbs(state, state.host, normalizePath(state.cwd, rest[0]));
  if (c === null) return ["cut: error"];
  return [
    c
      .split("\n")
      .map((line) => line.split(/\s+/)[f - 1] ?? "")
      .join("\n"),
  ];
}

function runXxd(state: GameState, args: string[]): string[] {
  if (!state.unlocked.e4) return ["xxd: command not found"];
  if (!args[0]) return ["xxd: missing file"];
  const c = readFileAbs(state, state.host, normalizePath(state.cwd, args[0]));
  if (c === null) return ["xxd: error"];
  const enc = new TextEncoder().encode(c);
  const lines: string[] = [];
  for (let i = 0; i < enc.length; i += 16) {
    const chunk = enc.slice(i, i + 16);
    const hex = [...chunk].map((b) => b.toString(16).padStart(2, "0")).join(" ");
    lines.push(`${i.toString(16).padStart(8, "0")}: ${hex}`);
  }
  return lines;
}

function runDecryptBundle(state: GameState, args: string[]): {
  lines: string[];
  state: GameState;
} {
  const pass = args.join(" ").replace(/^["']|["']$/g, "") || BUNDLE_PASS;
  if (pass !== BUNDLE_PASS)
    return {
      lines: ["decrypt-bundle: неверный пароль."],
      state,
    };
  if (state.host !== "main" && state.host !== "honeypot")
    return {
      lines: ["decrypt-bundle: выполните на основном узле (после ssh с K9F2)."],
      state,
    };
  const flags = { ...state.flags, hasTruthKey: true, bundleDecrypted: true };
  const next = unlockProgress({ ...state, flags }, flags);
  return {
    lines: [
      "bundle.enc: OK",
      "Создан /mnt/archive/bundle_decrypted/ (manifest.json, вложения).",
      `audit_hash=${AUDIT_HASH}`,
    ],
    state: next,
  };
}

function runSshStart(state: GameState, args: string[]): { lines: string[]; state: GameState } {
  const target = args.join(" ").toLowerCase();
  if (target.includes("internal")) {
    if (state.host !== "main")
      return { lines: ["ssh: internal только с основного узла (main)."], state };
    return {
      lines: [],
      state: { ...state, awaitingSSH: { kind: "internal_password" } },
    };
  }
  if (state.host !== "staging")
    return { lines: ["ssh: для входа на main используйте staging."], state };
  if (!target.includes("main") && !target.includes("oracle") && !target.includes("guest"))
    return { lines: ["ssh: попробуйте: ssh guest@main"], state };
  return {
    lines: [],
    state: { ...state, awaitingSSH: { kind: "staging", stage: "password" } },
  };
}

function runScp(state: GameState, args: string[]): { lines: string[]; state: GameState } {
  if (args.length < 2) return { lines: ["scp: usage: scp FILE guest@main:/srv/gov/inbox/"], state };
  const local = args[0];
  const remote = args[1];
  if (!remote.includes("main") || !remote.includes("inbox"))
    return { lines: ["scp: пример: scp /srv/gov/legal/frame_A_operator_liability.txt guest@main:/srv/gov/inbox/"], state };
  const abs = normalizePath(state.cwd, local);
  const c = readFileAbs(state, state.host, abs);
  if (c === null) return { lines: [`scp: ${local}: not found`], state };
  const name = basename(abs);
  const path = "/srv/gov/inbox/" + name;
  const ov = { ...(state.fileOverrides.main ?? {}) };
  ov[path] = c;
  let flags = { ...state.flags };
  if (name.includes("frame_A")) flags.govFrame = "A";
  if (name.includes("frame_B")) flags.govFrame = "B";
  return {
    lines: [`100% ${name} → main:${path}`],
    state: { ...state, flags, fileOverrides: { ...state.fileOverrides, main: ov } },
  };
}

function runCp(state: GameState, args: string[]): { lines: string[]; state: GameState } {
  if (args.length < 2) return { lines: ["cp: usage: cp SRC DST"], state };
  const src = normalizePath(state.cwd, args[0]);
  const dst = normalizePath(state.cwd, args[1]);
  const c = readFileAbs(state, state.host, src);
  if (c === null) return { lines: ["cp: source not found"], state };
  const ov = { ...(state.fileOverrides[state.host] ?? {}) };
  ov[dst] = c;
  let flags = state.flags;
  if (dst.includes("inbox") && src.includes("frame_A")) flags = { ...flags, govFrame: "A" };
  if (dst.includes("inbox") && src.includes("frame_B")) flags = { ...flags, govFrame: "B" };
  return {
    lines: [`скопировано → ${dst}`],
    state: { ...state, flags, fileOverrides: { ...state.fileOverrides, [state.host]: ov } },
  };
}

function runMkdir(state: GameState, args: string[]): { lines: string[]; state: GameState } {
  if (!args[0]) return { lines: ["mkdir: missing operand"], state };
  const abs = normalizePath(state.cwd, args[0]);
  const ex = new Set(state.extraDirs[state.host] ?? []);
  ex.add(abs);
  return {
    lines: [""],
    state: { ...state, extraDirs: { ...state.extraDirs, [state.host]: ex } },
  };
}

function runDisconnect(state: GameState): string[] {
  if (state.host === "internal") {
    return [
      "__STATE__" +
        JSON.stringify({
          ...state,
          host: "main" as HostId,
          cwd: "/",
          user: "guest",
        }),
      "Соединение с internal.core закрыто.",
    ];
  }
  if (state.host === "main" || state.host === "honeypot") {
    return [
      "__STATE__" +
        JSON.stringify({
          ...state,
          host: "staging" as HostId,
          cwd: "/",
          user: "guest",
        }),
      "Сессия закрыта. term.staging.null.",
    ];
  }
  return ["Нет удалённого сеанса."];
}

function runMirrorStart(state: GameState): { lines: string[]; state: GameState } {
  if (state.host !== "internal")
    return {
      lines: ["mirror: запускайте на internal.core (ssh internal.core с main)."],
      state,
    };
  return {
    lines: [],
    state: { ...state, awaitingMirror: { step: 0 } },
  };
}

function runWitnessPack(state: GameState): { lines: string[]; state: GameState } {
  if (state.host !== "main" && state.host !== "honeypot")
    return { lines: ["witness-pack: только на основном узле."], state };
  if (!state.flags.bundleDecrypted)
    return { lines: ["witness-pack: сначала decrypt-bundle."], state };
  const m = readFileAbs(state, state.host, "/mnt/archive/bundle_decrypted/manifest.json");
  if (!m || !m.includes(AUDIT_HASH))
    return { lines: ["witness-pack: нет manifest."], state };
  if (state.host === "honeypot")
    return {
      lines: [
        "[EXPORT] hash: deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
        "Слишком ровно. Проверьте honeypot — выход: exit → другой серийник K9F2.",
      ],
      state,
    };
  if (!state.flags.exportReady) {
    return {
      lines: [
        "witness-pack: нет WITNESS-TOKEN. На internal.core: cat /var/secrets/export_token.witness",
      ],
      state,
    };
  }
  const flags = {
    ...state.flags,
    sealFinal: true,
    finalEnding: "A" as const,
  };
  return {
    lines: [
      "[EXPORT] запечатано: /out/WITNESS_bundle.manifest",
      "[EXPORT] хэш: a19f…c81",
      "[SYSTEM] внешняя квитанция: В ОЧЕРЕДИ",
      "ЭПИЛОГ: SUBJECT_ID подтверждён — канал свидетеля открыт.",
      "__STATE__" + JSON.stringify({ ...state, flags }),
    ],
    state,
  };
}

function runSanitize(state: GameState, args: string[]): { lines: string[]; state: GameState } {
  if (!args.includes("--i-understand"))
    return { lines: ["sanitize: требуется --i-understand"], state };
  const ov = { ...(state.fileOverrides.main ?? {}) };
  ov["/mnt/archive/keyparts/k1.blob"] = "";
  const flags = {
    ...state.flags,
    sanitizeDone: true,
    sealFinal: true,
    finalEnding: "B" as const,
    hasTruthKey: false,
    bundleDecrypted: false,
  };
  return {
    lines: [
      "[SANITIZE] keyparts: уничтожено",
      "[SANITIZE] логи: отредактированы",
      "ЭПИЛОГ: ты в безопасности, потому что тебя нет.",
      "__STATE__" +
        JSON.stringify({
          ...state,
          flags,
          fileOverrides: { ...state.fileOverrides, main: ov },
        }),
    ],
    state,
  };
}

function runMirrorBind(state: GameState): { lines: string[]; state: GameState } {
  if (state.host !== "internal") return { lines: ["mirror-bind: только на internal.core."], state };
  if (!state.flags.rootToken)
    return { lines: ["mirror-bind: выполните mirror (stability ≥ 70)."], state };
  const flags = {
    ...state.flags,
    mirrorBound: true,
    sealFinal: true,
    finalEnding: "C" as const,
  };
  return {
    lines: [
      "[BIND] root.token принят",
      "[BIND] автономия MIRROR: ВКЛ",
      "ЭПИЛОГ: владелец шелла: MIRROR",
      "__STATE__" + JSON.stringify({ ...state, flags }),
    ],
    state,
  };
}

function runHint(state: GameState): string[] {
  return [
    "staging: ssh guest@main → пароль silencio-7 → серийник K9F2.",
    "Пароль bundle: ORACLE_SHADOW#2027_NULL",
    "main: diff /var/log/access.log access.log.bak",
    "main: ssh internal.core → пароль operator_7",
    "internal: mirror → два слова → mirror-bind",
    "witness-pack: decrypt-bundle, затем cat export_token на internal, затем witness-pack на main.",
  ];
}

function runHelp(state: GameState): string[] {
  const base =
    "pwd cd ls cat echo whoami hostname date clear help history hint logout exit ssh scp cp mkdir";
  const ext = state.unlocked.e2 ? " grep find wc sort uniq" : "";
  const ext2 = state.unlocked.e3 ? " diff" : "";
  const ext3 = state.unlocked.e4 ? " xxd" : "";
  const ext4 = state.unlocked.e5 ? " decrypt-bundle" : "";
  const fin =
    state.host === "internal"
      ? " mirror mirror-bind"
      : state.host === "main"
        ? " witness-pack sanitize"
        : "";
  return [`Команды: ${base}${ext}${ext2}${ext3}${ext4}${fin}`];
}

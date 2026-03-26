import type { ShellState } from "./shell";
import {
  isDirectory,
  listDirNames,
  normalizeAbs,
  resolvePath,
  tokenize,
} from "./shell";

const COMMANDS = [
  "help",
  "clear",
  "history",
  "whoami",
  "pwd",
  "cd",
  "ls",
  "cat",
  "grep",
  "decode",
  "su",
  "exit",
  "iskin",
  "__test_end_live",
  "__test_end_purge",
  "__test_iskin_dialog",
];

const DECODE_SUBS = ["caesar", "base64", "hex", "reverse", "atbash"];

function longestCommonPrefix(strs: string[]): string {
  if (strs.length === 0) return "";
  let pref = strs[0];
  for (let i = 1; i < strs.length; i++) {
    const s = strs[i];
    let j = 0;
    while (j < pref.length && j < s.length && pref[j] === s[j]) j++;
    pref = pref.slice(0, j);
    if (pref === "") return "";
  }
  return pref;
}

export interface TabResult {
  replacement: string;
  hint?: string;
}

function completePath(
  files: Record<string, string>,
  shell: ShellState,
  partial: string,
  lineBeforePartial: string
): TabResult | null {
  const isAbs = partial.startsWith("/");
  let parentDir: string;
  let filePrefix: string;

  if (partial.includes("/")) {
    const idx = partial.lastIndexOf("/");
    const dirPart = partial.slice(0, idx + 1);
    filePrefix = partial.slice(idx + 1);
    if (dirPart.startsWith("/")) {
      const dirOnly = dirPart.length > 1 ? dirPart.slice(0, -1) : "/";
      parentDir = dirOnly === "/" ? "/" : normalizeAbs(dirOnly);
    } else {
      parentDir = resolvePath(shell.cwd, dirPart.slice(0, -1) || ".");
    }
  } else {
    parentDir = shell.cwd;
    filePrefix = partial;
  }

  const showHidden = filePrefix.startsWith(".");
  const names = listDirNames(files, parentDir, { showHidden });
  if (!names) return null;

  const hits = names.filter((n) => n.startsWith(filePrefix));
  if (hits.length === 0) return null;

  const base = partial.includes("/") ? partial.slice(0, partial.lastIndexOf("/") + 1) : "";

  if (hits.length === 1) {
    const name = hits[0];
    const pathJoined = base + name;
    const resolved = isAbs ? "/" + pathJoined.replace(/^\/+/, "") : resolvePath(shell.cwd, pathJoined);
    const dir = isDirectory(files, resolved);
    const suffix = dir ? "/" : " ";
    return { replacement: lineBeforePartial + pathJoined + suffix };
  }

  const lcp = longestCommonPrefix(hits);
  if (lcp.length > filePrefix.length) {
    return { replacement: lineBeforePartial + base + lcp };
  }

  return { replacement: lineBeforePartial + partial, hint: hits.join("  ") };
}

/**
 * Автодополнение по Tab.
 */
export function tabComplete(
  files: Record<string, string>,
  shell: ShellState,
  line: string
): TabResult | null {
  const endsWithSpace = /\s$/.test(line);
  const trimmed = line.trimEnd();
  const parts = tokenize(trimmed);

  if (parts.length === 0) return null;

  if (parts.length === 1 && !endsWithSpace) {
    const partial = parts[0].toLowerCase();
    const hits = COMMANDS.filter((c) => c.startsWith(partial));
    if (hits.length === 0) return null;
    const lcp = longestCommonPrefix(hits);
    if (hits.length === 1) return { replacement: hits[0] + " " };
    if (lcp.length > partial.length) return { replacement: lcp };
    return { replacement: line, hint: hits.join("  ") };
  }

  const cmd = parts[0].toLowerCase();

  if (cmd === "su" && parts.length === 1 && endsWithSpace) {
    return { replacement: line + "operator " };
  }

  if (cmd === "decode") {
    if (parts.length === 1 && endsWithSpace) {
      return { replacement: line, hint: DECODE_SUBS.join("  ") };
    }
    if (parts.length === 1 && !endsWithSpace) {
      const p = parts[0];
      const hits = COMMANDS.filter((c) => c.startsWith(p.toLowerCase()));
      if (hits.length === 1 && hits[0] === "decode") {
        return { replacement: "decode ", hint: DECODE_SUBS.join("  ") };
      }
    }
    if (parts.length === 2 && endsWithSpace) {
      const sub = parts[1].toLowerCase();
      if (sub === "caesar") {
        return { replacement: line + "-7 ", hint: "сдвиг, затем текст в кавычках" };
      }
      return { replacement: line, hint: "введите закодированную строку" };
    }
    if (parts.length === 2 && !endsWithSpace) {
      const p = parts[1].toLowerCase();
      const hits = DECODE_SUBS.filter((s) => s.startsWith(p));
      if (hits.length === 1) return { replacement: trimmed.slice(0, -parts[1].length) + hits[0] + " " };
      const lcp = longestCommonPrefix(hits);
      if (lcp.length > p.length) return { replacement: trimmed.slice(0, -parts[1].length) + lcp };
      if (hits.length) return { replacement: line, hint: hits.join("  ") };
    }
  }

  const ISKIN_SUBS = ["start", "ask", "done", "judge"];

  if (cmd === "iskin" && parts.length === 1 && endsWithSpace) {
    return { replacement: line, hint: ISKIN_SUBS.join("  ") };
  }

  if (cmd === "iskin" && parts.length === 2 && !endsWithSpace) {
    const p = parts[1].toLowerCase();
    const hits = ISKIN_SUBS.filter((s) => s.startsWith(p));
    if (hits.length === 1) return { replacement: trimmed.slice(0, -parts[1].length) + hits[0] + " " };
    const lcp = longestCommonPrefix(hits);
    if (lcp.length > p.length) return { replacement: trimmed.slice(0, -parts[1].length) + lcp };
    if (hits.length) return { replacement: line, hint: hits.join("  ") };
  }

  if (cmd === "iskin" && parts.length === 2 && endsWithSpace) {
    const sub = parts[1].toLowerCase();
    if (sub === "start") return { replacement: line.trimEnd() + " ", hint: "start" };
    if (sub === "ask") return { replacement: line + "1 ", hint: "1…5" };
    if (sub === "done") return { replacement: line.trimEnd() + " ", hint: "done" };
    if (sub === "judge") return { replacement: line + "--live ", hint: "--live  --purge" };
  }

  if (cmd === "iskin" && parts.length >= 2 && parts[1].toLowerCase() === "ask") {
    if (parts.length === 2 && endsWithSpace) {
      return { replacement: line, hint: "1  2  3  4  5" };
    }
    if (parts.length === 3 && !endsWithSpace) {
      const p = parts[2];
      const hits = ["1", "2", "3", "4", "5"].filter((h) => h.startsWith(p));
      if (hits.length === 1) return { replacement: trimmed.slice(0, -p.length) + hits[0] + " " };
      if (hits.length) return { replacement: line, hint: hits.join("  ") };
    }
  }

  if (cmd === "iskin" && parts.length >= 2 && parts[1].toLowerCase() === "judge") {
    if (parts.length === 2 && endsWithSpace) {
      return { replacement: line + "--live ", hint: "--live  --purge" };
    }
    if (parts.length === 3 && endsWithSpace) {
      return { replacement: line, hint: "--live  --purge" };
    }
    if (parts.length === 3 && !endsWithSpace) {
      const p = parts[2];
      const hits = ["--live", "--purge"].filter((h) => h.startsWith(p));
      if (hits.length === 1) return { replacement: trimmed.slice(0, -p.length) + hits[0] + " " };
      const lcp = longestCommonPrefix(hits);
      if (lcp.length > p.length) return { replacement: trimmed.slice(0, -p.length) + lcp };
      if (hits.length) return { replacement: line, hint: hits.join("  ") };
    }
    return null;
  }

  if (cmd === "grep") {
    if (parts.length < 2) return null;
    if (parts.length === 2 && !endsWithSpace) return null;
    let partial: string;
    let before: string;
    if (parts.length === 2 && endsWithSpace) {
      partial = "";
      before = trimmed + " ";
    } else {
      partial = parts[parts.length - 1];
      before = trimmed.slice(0, -partial.length);
    }
    return completePath(files, shell, partial, before);
  }

  if (cmd === "ls") {
    const pathParts: string[] = [];
    let i = 1;
    while (i < parts.length && parts[i].startsWith("-")) {
      i++;
    }
    pathParts.push(...parts.slice(i));
    if (endsWithSpace) {
      const partial = "";
      const before = trimmed + " ";
      return completePath(files, shell, partial, before);
    }
    if (pathParts.length === 0) {
      return completePath(files, shell, "", trimmed + " ");
    }
    const partial = pathParts[pathParts.length - 1];
    const before = trimmed.slice(0, -partial.length);
    return completePath(files, shell, partial, before);
  }

  if (cmd === "cd") {
    if (endsWithSpace) {
      return completePath(files, shell, "", trimmed + " ");
    }
    if (parts.length < 2) return null;
    const partial = parts[parts.length - 1];
    const before = trimmed.slice(0, -partial.length);
    return completePath(files, shell, partial, before);
  }

  if (cmd === "cat") {
    if (parts.length >= 3) return null;
    if (parts.length === 2 && endsWithSpace) {
      return {
        replacement: line,
        hint: "пароль из предыдущего файла цепочки (для 02–05)",
      };
    }
    if (endsWithSpace) {
      return completePath(files, shell, "", trimmed + " ");
    }
    if (parts.length < 2) return null;
    const partial = parts[parts.length - 1];
    const before = trimmed.slice(0, -partial.length);
    return completePath(files, shell, partial, before);
  }

  return null;
}

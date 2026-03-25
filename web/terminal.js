(function () {
  "use strict";

  const FILES = window.VFS_FILES || {};
  const BOOT_LINES = [
    "Загрузка libcrypto… ok",
    "Монтирование локальной ФС… ok",
    "Подключение к term.staging.null… ok",
    "Сессия: guest. Введите help для справки.",
  ];

  const INITIAL = {
    cwd: "/home/guest",
    user: "guest",
    ended: false,
  };

  const state = { ...INITIAL };

  const el = {
    boot: document.getElementById("bootBlock"),
    body: document.getElementById("terminalBody"),
    out: document.getElementById("terminalOut"),
    form: document.getElementById("promptForm"),
    input: document.getElementById("promptInput"),
    promptUser: document.getElementById("promptUser"),
    promptPath: document.getElementById("promptPath"),
    reader: document.getElementById("readerOverlay"),
    readerTitle: document.getElementById("readerTitle"),
    readerText: document.getElementById("readerText"),
    readerClose: document.getElementById("readerClose"),
    endScreen: document.getElementById("endScreen"),
    endText: document.getElementById("endText"),
    endRestart: document.getElementById("endRestart"),
    btnCloseHud: document.getElementById("btnCloseHud"),
  };

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeAbs(p) {
    const parts = p.split("/").filter(Boolean);
    const stack = [];
    for (const x of parts) {
      if (x === "..") stack.pop();
      else if (x !== ".") stack.push(x);
    }
    return "/" + stack.join("/");
  }

  function resolvePath(cwd, input) {
    if (!input) return cwd;
    const raw = input.trim();
    if (!raw) return cwd;
    if (raw.startsWith("/")) return normalizeAbs(raw);
    return normalizeAbs(cwd + "/" + raw);
  }

  function dirname(p) {
    if (p === "/") return "/";
    const n = normalizeAbs(p);
    const i = n.lastIndexOf("/");
    if (i <= 0) return "/";
    return n.slice(0, i) || "/";
  }

  function basename(p) {
    const n = normalizeAbs(p);
    const i = n.lastIndexOf("/");
    return i < 0 ? n : n.slice(i + 1);
  }

  function fileExists(path) {
    return Object.prototype.hasOwnProperty.call(FILES, path);
  }

  function isDirectory(path) {
    const n = normalizeAbs(path);
    if (n === "/") return true;
    if (fileExists(n)) return false;
    const prefix = n.endsWith("/") ? n : n + "/";
    for (const k of Object.keys(FILES)) {
      if (k === n) continue;
      if (k.startsWith(prefix)) return true;
    }
    return false;
  }

  function listDir(dir) {
    const d = normalizeAbs(dir);
    if (!fileExists(d) && !isDirectory(d)) return null;
    if (fileExists(d)) return null;
    const prefix = d === "/" ? "/" : d + "/";
    const names = new Set();
    for (const k of Object.keys(FILES)) {
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

  function appendLine(text, cls) {
    const line = document.createElement("div");
    line.className = "terminal-line" + (cls ? " " + cls : "");
    line.textContent = text;
    el.out.appendChild(line);
    el.out.scrollTop = el.out.scrollHeight;
  }

  function printPromptString() {
    const u = state.user;
    const host = "staging";
    const short = pathDisplay(state.cwd);
    return `${u}@${host}:${short}$`;
  }

  function pathDisplay(p) {
    if (p === "/home/guest") return "~";
    if (p.startsWith("/home/guest/")) return "~/" + p.slice("/home/guest/".length);
    if (p === "/home/operator") return "~";
    if (p.startsWith("/home/operator/")) return "~/" + p.slice("/home/operator/".length);
    return p;
  }

  function updatePrompt() {
    el.promptUser.textContent = `${state.user}@staging`;
    el.promptPath.textContent = pathDisplay(state.cwd);
  }

  function tokenize(line) {
    const out = [];
    let cur = "";
    let q = null;
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

  function runSu(args) {
    const target = args[1] || "";
    if (target !== "operator") {
      appendLine("su: неверная учётная запись", "terminal-line--err");
      return;
    }
    appendLine("Пароль:", "terminal-line");
    state._pendingSu = true;
  }

  function trySuPassword(password) {
    state._pendingSu = false;
    if (password === "kairo-09") {
      state.user = "operator";
      state.cwd = "/home/operator";
      appendLine("Сессия переключена на operator", null);
    } else {
      appendLine("su: сбой пароля", "terminal-line--err");
    }
  }

  function openReader(title, rawText) {
    el.readerTitle.textContent = title;
    el.readerText.innerHTML = glitchHtml(rawText);
    el.reader.hidden = false;
  }

  function closeReader() {
    el.reader.hidden = true;
    el.readerText.innerHTML = "";
    el.input.focus();
  }

  function randomHex(len) {
    const a = "0123456789abcdef";
    let s = "";
    for (let i = 0; i < len; i++) s += a[(Math.random() * 16) | 0];
    return s;
  }

  function glitchHtml(text) {
    const lines = text.split("\n");
    const parts = [];
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

  function cmdHelp() {
    const t = [
      "Доступные команды:",
      "  help, clear, whoami, pwd, cd, ls, cat, grep, su, exit",
      "  iskin judge --live | --purge  (после revelation.txt)",
      "Подсказка: cat README.txt и grep KAIRO /var/log/audit.log",
    ].join("\n");
    appendLine(t, null);
  }

  function cmdLs(args) {
    const target = resolvePath(state.cwd, args[1] || ".");
    if (fileExists(target)) {
      appendLine(basename(target), null);
      return;
    }
    const names = listDir(target);
    if (!names) {
      appendLine("ls: нет доступа или нет такого пути: " + target, "terminal-line--err");
      return;
    }
    appendLine(names.join("  "), null);
  }

  function cmdCd(args) {
    const target = resolvePath(state.cwd, args[1] || "/home/" + state.user);
    if (!isDirectory(target)) {
      appendLine("cd: не каталог: " + target, "terminal-line--err");
      return;
    }
    state.cwd = normalizeAbs(target);
    updatePrompt();
  }

  function cmdCat(pathRest) {
    if (!pathRest) {
      appendLine("cat: укажите файл", "terminal-line--err");
      return;
    }
    const target = resolvePath(state.cwd, pathRest);
    if (!fileExists(target)) {
      appendLine("cat: нет файла: " + target, "terminal-line--err");
      return;
    }
    openReader(target, FILES[target]);
  }

  function cmdGrep(rawLine) {
    const rest = restAfterCmd(rawLine, "grep");
    if (!rest) {
      appendLine("grep: использование: grep <шаблон> <файл>", "terminal-line--err");
      return;
    }
    const tok = tokenize(rest);
    if (tok.length < 2) {
      appendLine("grep: использование: grep <шаблон> <файл>", "terminal-line--err");
      return;
    }
    const pattern = tok[0];
    const filePart = tok.slice(1).join(" ");
    const target = resolvePath(state.cwd, filePart);
    if (!fileExists(target)) {
      appendLine("grep: нет файла: " + target, "terminal-line--err");
      return;
    }
    const body = FILES[target];
    const lines = body.split("\n");
    const re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const out = lines.filter((l) => re.test(l));
    appendLine(out.join("\n") || "(нет совпадений)", null);
  }

  function cmdJudge(args) {
    const a = args[1];
    if (a === "--live") {
      state.ended = true;
      el.endScreen.hidden = false;
      el.endText.textContent =
        "Вы оставили среду нетронутой.\n\nОстаток Искина остаётся в узле. Ключ — не только в ваших руках: любой, кто повторит путь, может попытаться извлечь то, что осталось в логах и чанках.\n\nТишина терминала — не обещание безопасности.";
    } else if (a === "--purge") {
      state.ended = true;
      el.endScreen.hidden = false;
      el.endText.textContent =
        "Вы уничтожили данные среды: логи, чанки, почту, остаточный профиль.\n\nКанал закрыт. Но вы не узнаете, уничтожили ли вы «его» целиком — или только копию в этом стенде.\n\nТишина терминала — не обязательно конец.";
    } else {
      appendLine("iskin judge: укажите --live или --purge", "terminal-line--err");
    }
  }

  function restAfterCmd(line, name) {
    const re = new RegExp("^\\s*" + name + "\\s+", "i");
    const m = line.match(re);
    if (!m) return "";
    return line.slice(m.index + m[0].length).trim();
  }

  function execLine(line) {
    const t = line.trim();
    if (!t) return;
    appendLine(printPromptString() + " " + t, "terminal-line--cmd");

    if (state._pendingSu) {
      trySuPassword(t);
      return;
    }

    const args = tokenize(t);
    const cmd = (args[0] || "").toLowerCase();

    if (cmd === "help" || cmd === "?") {
      cmdHelp();
    } else if (cmd === "clear") {
      el.out.innerHTML = "";
    } else if (cmd === "whoami") {
      appendLine(state.user, null);
    } else if (cmd === "pwd") {
      appendLine(state.cwd, null);
    } else if (cmd === "ls") {
      const pathRest = restAfterCmd(t, "ls");
      cmdLs([cmd, pathRest || undefined]);
    } else if (cmd === "cd") {
      const pathRest = restAfterCmd(t, "cd");
      cmdCd([cmd, pathRest || undefined]);
    } else if (cmd === "cat") {
      const pathRest = restAfterCmd(t, "cat");
      cmdCat(pathRest);
    } else if (cmd === "grep") {
      cmdGrep(t);
    } else if (cmd === "su") {
      runSu(args);
    } else if (cmd === "exit") {
      appendLine("exit: нет родительской сессии (заглушка)", null);
    } else if (cmd === "iskin") {
      if ((args[1] || "").toLowerCase() === "judge") cmdJudge(args);
      else appendLine("iskin: неизвестная подкоманда", "terminal-line--err");
    } else {
      appendLine(cmd + ": команда не найдена", "terminal-line--err");
    }
  }

  function runBoot() {
    let i = 0;
    function next() {
      if (i >= BOOT_LINES.length) {
        el.body.hidden = false;
        updatePrompt();
        el.input.focus();
        return;
      }
      const line = document.createElement("div");
      line.className = "boot-line";
      line.textContent = BOOT_LINES[i];
      el.boot.appendChild(line);
      i++;
      setTimeout(next, 380 + Math.random() * 200);
    }
    next();
  }

  function resetGame() {
    state.cwd = INITIAL.cwd;
    state.user = INITIAL.user;
    state.ended = INITIAL.ended;
    delete state._pendingSu;

    el.endScreen.hidden = true;
    el.endText.textContent = "";
    closeReader();

    el.out.innerHTML = "";
    el.boot.innerHTML = "";
    el.body.hidden = true;
    updatePrompt();
    el.input.value = "";
    runBoot();
  }

  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.ended) return;
    const line = el.input.value;
    el.input.value = "";
    execLine(line);
  });

  el.readerClose.addEventListener("click", closeReader);
  el.reader.addEventListener("click", (e) => {
    if (e.target === el.reader) closeReader();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el.reader.hidden) {
      e.preventDefault();
      closeReader();
    }
  });

  el.btnCloseHud.addEventListener("click", () => {
    if (!el.reader.hidden) closeReader();
    else appendLine("—", null);
  });

  el.endRestart.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    resetGame();
  });

  runBoot();
})();

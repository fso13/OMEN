/** Компактные справки в стиле man (рус.), для `команда --help` / `-help`. */

const LINE = "─".repeat(52);

function header(name: string): string {
  return `${name.toUpperCase()}\n${LINE}`;
}

function block(title: string, body: string): string {
  return `${title}\n${body.trim()}`;
}

export function getCommandHelp(cmd: string, args: string[]): string | null {
  const c = cmd.toLowerCase();
  if (c === "iskin" && (args[1] || "").toLowerCase() === "judge") {
    return manIskinJudge();
  }
  switch (c) {
    case "help":
    case "?":
      return manHelp();
    case "clear":
      return manClear();
    case "history":
      return manHistory();
    case "whoami":
      return manWhoami();
    case "pwd":
      return manPwd();
    case "cd":
      return manCd();
    case "ls":
      return manLs();
    case "cat":
      return manCat();
    case "grep":
      return manGrep();
    case "decode":
      return manDecode();
    case "su":
      return manSu();
    case "exit":
      return manExit();
    case "iskin":
      return manIskin();
    case "__test_end_live":
    case "__test_end_purge":
      return manTestEnd(c);
    default:
      return null;
  }
}

function manHelp(): string {
  return [
    header("help"),
    LINE,
    block(
      "ИМЯ",
      "help, ? — краткий список команд и подсказок."
    ),
    block(
      "ОПИСАНИЕ",
      "Показывает обзор. У каждой команды есть справка: команда --help или -help."
    ),
    LINE,
  ].join("\n");
}

function manClear(): string {
  return [
    header("clear"),
    LINE,
    block("ИМЯ", "clear — очистить вывод терминала."),
    block("СИНТАКСИС", "clear"),
    block("ОПИСАНИЕ", "Стирает историю строк на экране (не затрагивает состояние сессии)."),
    LINE,
  ].join("\n");
}

function manHistory(): string {
  return [
    header("history"),
    LINE,
    block("ИМЯ", "history — список ранее введённых команд."),
    block("СИНТАКСИС", "history"),
    block(
      "ОПИСАНИЕ",
      "Показывает пронумерованные строки. Пароли после su не сохраняются. Хранится до 500 записей; сохраняется вместе с прогрессом. В строке ввода: ↑ / ↓ для выбора ранее введённых команд."
    ),
    LINE,
  ].join("\n");
}

function manWhoami(): string {
  return [
    header("whoami"),
    LINE,
    block("ИМЯ", "whoami — имя текущего пользователя."),
    block("СИНТАКСИС", "whoami"),
    block("ОПИСАНИЕ", "Выводит учётную запись (guest или operator)."),
    LINE,
  ].join("\n");
}

function manPwd(): string {
  return [
    header("pwd"),
    LINE,
    block("ИМЯ", "pwd — текущий каталог (абсолютный путь)."),
    block("СИНТАКСИС", "pwd"),
    LINE,
  ].join("\n");
}

function manCd(): string {
  return [
    header("cd"),
    LINE,
    block("ИМЯ", "cd — сменить каталог."),
    block("СИНТАКСИС", "cd [КАТАЛОГ]"),
    block(
      "ОПИСАНИЕ",
      "Без аргумента — домашний каталог (/home/USER). Поддерживаются относительные и абсолютные пути, .. и ."
    ),
    LINE,
  ].join("\n");
}

function manLs(): string {
  return [
    header("ls"),
    LINE,
    block("ИМЯ", "ls — список имён в каталоге."),
    block("СИНТАКСИС", "ls [-a] [-l] [КАТАЛОГ]"),
    block(
      "ОПЦИИ",
      `-a  показать скрытые имена (начинаются с .)
-l  подробный список (права, размер, дата)
-al / -la  оба флага`
    ),
    block(
      "ОПИСАНИЕ",
      "Без -a скрытые файлы не показываются. Путь по умолчанию — текущий каталог."
    ),
    LINE,
  ].join("\n");
}

function manCat(): string {
  return [
    header("cat"),
    LINE,
    block("ИМЯ", "cat — вывести файл (в этой игре — в окне чтения)."),
    block("СИНТАКСИС", "cat ФАЙЛ"),
    block("ОПИСАНИЕ", "Путь может быть относительным к текущему каталогу."),
    LINE,
  ].join("\n");
}

function manGrep(): string {
  return [
    header("grep"),
    LINE,
    block("ИМЯ", "grep — строки файла, совпадающие с шаблоном."),
    block("СИНТАКСИС", "grep ШАБЛОН ФАЙЛ"),
    block("ОПИСАНИЕ", "Шаблон — подстрока; сравнение без учёта регистра. Регулярные выражения не используются."),
    LINE,
  ].join("\n");
}

function manDecode(): string {
  return [
    header("decode"),
    LINE,
    block(
      "ИМЯ",
      "decode — расшифровка строк в терминале (загадки в файлах OMEN)."
    ),
    block(
      "СИНТАКСИС",
      `decode caesar СДВИГ ТЕКСТ
       decode base64 СТРОКА
       decode hex СТРОКА
       decode reverse ТЕКСТ
       decode atbash ТЕКСТ`
    ),
    block(
      "ОПИСАНИЕ",
      `caesar — сдвиг букв кириллицы (33 буквы) и латиницы (26). Отрицательный сдвиг — в обратную сторону (типично для «взлома» +7).
base64 / hex — декодирование в UTF-8 (hex без пробелов, можно с префиксом 0x).
reverse — символы в обратном порядке.
atbash — зеркало алфавита (кириллица и латиница).`
    ),
    LINE,
  ].join("\n");
}

function manSu(): string {
  return [
    header("su"),
    LINE,
    block("ИМЯ", "su — сменить пользователя (здесь: только operator)."),
    block("СИНТАКСИС", "su operator"),
    block("ОПИСАНИЕ", "Запрашивает пароль в следующей строке. Пароль ищется в логах (KAIRO)."),
    LINE,
  ].join("\n");
}

function manExit(): string {
  return [
    header("exit"),
    LINE,
    block("ИМЯ", "exit — выход из оболочки."),
    block("СИНТАКСИС", "exit"),
    block("ОПИСАНИЕ", "В демо не завершает сессию (заглушка)."),
    LINE,
  ].join("\n");
}

function manIskin(): string {
  return [
    header("iskin"),
    LINE,
    block("ИМЯ", "iskin — внутренние подкоманды OMEN."),
    block("СИНТАКСИС", "iskin judge --live | --purge"),
    block("ОПИСАНИЕ", "Судьба Искина после прочтения revelation.txt. Справка по judge: iskin judge --help"),
    LINE,
  ].join("\n");
}

function manIskinJudge(): string {
  return [
    header("iskin judge"),
    LINE,
    block("ИМЯ", "iskin judge — финальный выбор судьи."),
    block("СИНТАКСИС", "iskin judge --live\n       iskin judge --purge"),
    block(
      "ОПЦИИ",
      `--live   оставить среду и остаток Искина
--purge  стереть данные среды (концовка сюжета)`
    ),
    LINE,
  ].join("\n");
}

function manTestEnd(cmd: string): string {
  return [
    header(cmd),
    LINE,
    block("ИМЯ", `${cmd} — тест финального экрана без прохождения игры.`),
    block("СИНТАКСИС", cmd),
    block(
      "ОПИСАНИЕ",
      "__test_end_live — как iskin judge --live\n__test_end_purge — как iskin judge --purge"
    ),
    LINE,
  ].join("\n");
}

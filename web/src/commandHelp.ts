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
  const iskinSub = (args[1] || "").toLowerCase();
  if (c === "iskin" && iskinSub === "judge") {
    return manIskinJudge();
  }
  if (c === "iskin" && iskinSub === "ask") {
    return manIskinAsk();
  }
  if (c === "iskin" && iskinSub === "done") {
    return manIskinDone();
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
    case "__test_iskin_dialog":
      return manTestIskinDialog();
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
    block("ИМЯ", "iskin — диалог с Искином и финальный суд."),
    block(
      "СИНТАКСИС",
      `iskin ask N     — вопрос по номеру 1…5 (не более трёх за сессию)
iskin done        — завершить диалог и открыть iskin judge
iskin judge --live | --purge  — после revelation и iskin done`
    ),
    block(
      "ОПИСАНИЕ",
      "После cat revelation.txt Искин доступен в терминале. Свои вопросы вводить нельзя — только выбор из пяти номеров. Справки: iskin ask --help, iskin done --help, iskin judge --help"
    ),
    LINE,
  ].join("\n");
}

function manIskinAsk(): string {
  return [
    header("iskin ask"),
    LINE,
    block("ИМЯ", "iskin ask — задать один из пяти заготовленных вопросов Искину."),
    block("СИНТАКСИС", "iskin ask N   где N — 1, 2, 3, 4 или 5"),
    block(
      "ОПИСАНИЕ",
      "Можно задать не более трёх вопросов (разные номера). Требуется прочитать revelation.txt. После третьего вопроса диалог завершается автоматически; иначе введите iskin done."
    ),
    LINE,
  ].join("\n");
}

function manIskinDone(): string {
  return [
    header("iskin done"),
    LINE,
    block("ИМЯ", "iskin done — закончить диалог и разрешить iskin judge."),
    block("СИНТАКСИС", "iskin done"),
    block("ОПИСАНИЕ", "После этого доступны iskin judge --live и --purge."),
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
    block(
      "ОПИСАНИЕ",
      "Только после cat revelation.txt и завершения диалога (iskin ask / iskin done)."
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

function manTestIskinDialog(): string {
  return [
    header("__test_iskin_dialog"),
    LINE,
    block("ИМЯ", "__test_iskin_dialog — тест диалога с Искином без cat revelation."),
    block("СИНТАКСИС", "__test_iskin_dialog"),
    block(
      "ОПИСАНИЕ",
      "Помечает revelation как прочитанный и сбрасывает прогресс диалога. Дальше: iskin ask N, iskin done, iskin judge."
    ),
    LINE,
  ].join("\n");
}

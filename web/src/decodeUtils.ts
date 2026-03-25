/**
 * Расшифровка для игровых задач: Цезарь (кириллица и латиница), base64 UTF-8, hex UTF-8, реверс, атбаш.
 */

const RU_LOWER = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
const RU_UPPER = RU_LOWER.toUpperCase();

function rotRu(c: string, delta: number): string {
  let idx = RU_LOWER.indexOf(c);
  if (idx >= 0) {
    const n = (idx + delta + 33) % 33;
    return RU_LOWER[n];
  }
  idx = RU_UPPER.indexOf(c);
  if (idx >= 0) {
    const n = (idx + delta + 33) % 33;
    return RU_UPPER[n];
  }
  return c;
}

function rotLatin(c: string, delta: number): string {
  const a = "abcdefghijklmnopqrstuvwxyz";
  const A = a.toUpperCase();
  let idx = a.indexOf(c);
  if (idx >= 0) {
    const n = (idx + delta + 26) % 26;
    return a[n];
  }
  idx = A.indexOf(c);
  if (idx >= 0) {
    const n = (idx + delta + 26) % 26;
    return A[n];
  }
  return c;
}

/** Цезарь: delta отрицательный = «расшифровка», если текст зашифрован сдвигом +(-delta). Здесь shift — на сколько сдвинуть буквы (отрицательное = назад). */
export function caesarShift(text: string, shift: number): string {
  let out = "";
  for (const ch of text) {
    if (/[а-яёА-ЯЁ]/.test(ch)) out += rotRu(ch, shift);
    else if (/[a-zA-Z]/.test(ch)) out += rotLatin(ch, shift);
    else out += ch;
  }
  return out;
}

export function decodeBase64Utf8(b64: string): string {
  const clean = b64.replace(/\s+/g, "");
  try {
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    throw new Error("base64");
  }
}

export function decodeHexUtf8(hex: string): string {
  const clean = hex.replace(/\s+/g, "").replace(/^0x/i, "");
  if (clean.length % 2 !== 0) throw new Error("hex");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    const b = parseInt(clean.slice(i, i + 2), 16);
    if (Number.isNaN(b)) throw new Error("hex");
    bytes[i / 2] = b;
  }
  return new TextDecoder("utf-8").decode(bytes);
}

export function reverseText(s: string): string {
  return [...s].reverse().join("");
}

function atbashChar(c: string): string {
  let idx = RU_LOWER.indexOf(c);
  if (idx >= 0) return RU_LOWER[32 - idx];
  idx = RU_UPPER.indexOf(c);
  if (idx >= 0) return RU_UPPER[32 - idx];
  const a = "abcdefghijklmnopqrstuvwxyz";
  const A = a.toUpperCase();
  let i = a.indexOf(c);
  if (i >= 0) return a[25 - i];
  i = A.indexOf(c);
  if (i >= 0) return A[25 - i];
  return c;
}

export function atbash(text: string): string {
  return [...text].map(atbashChar).join("");
}

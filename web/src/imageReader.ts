/**
 * Если файл — одна base64-строка (или data:image/...;base64,...), при cat показываем картинку.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    const tag = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (tag === "WEBP") return "image/webp";
  }
  return null;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Возвращает HTML для оверлея чтения или null — тогда показываем обычный текст.
 */
function stripHashComments(s: string): string {
  return s
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"))
    .join("\n");
}

export function htmlForPossibleBase64Image(raw: string): string | null {
  const trimmed = stripHashComments(raw.trim());
  if (!trimmed) return null;

  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmed)) {
    const dataUrl = trimmed.split(/\s+/).join("");
    const b64 = dataUrl.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
    return wrapImage(dataUrl, b64);
  }

  const oneLine = trimmed.replace(/\s+/g, "");
  if (oneLine.length < 24) return null;
  if (!/^[A-Za-z0-9+/]+=*$/.test(oneLine)) return null;

  try {
    const bin = atob(oneLine);
    const n = bin.length;
    const bytes = new Uint8Array(n);
    for (let i = 0; i < n; i++) bytes[i] = bin.charCodeAt(i);
    const mime = sniffImageMime(bytes);
    if (!mime) return null;
    const dataUrl = `data:${mime};base64,${oneLine}`;
    return wrapImage(dataUrl, oneLine);
  } catch {
    return null;
  }
}

function wrapImage(dataUrl: string, rawForCopy: string): string {
  const safe = escapeAttr(dataUrl);
  return [
    '<div class="reader-image-block">',
    `<img src="${safe}" alt="" class="reader-b64-img" />`,
    "</div>",
    '<p class="reader-b64-caption">Содержимое файла — изображение (base64). Ниже — сырой текст для копирования.</p>',
    `<pre class="reader-text reader-text--raw-b64">${escapeHtml(rawForCopy)}</pre>`,
  ].join("");
}

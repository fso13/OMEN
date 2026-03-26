/**
 * Цепочка головоломок в /home/operator/Documents/puzzles/:
 * пароль к файлу N зашифрован в содержимом файла N−1; без верного cat с паролем доступ закрыт.
 */

export const PUZZLE_CHAIN_DIR = "/home/operator/Documents/puzzles";

/** Порядок файлов; первый открыт всегда. */
export const PUZZLE_CHAIN_ORDER = [
  `${PUZZLE_CHAIN_DIR}/01_caesar.txt`,
  `${PUZZLE_CHAIN_DIR}/02_b64.txt`,
  `${PUZZLE_CHAIN_DIR}/03_hex.txt`,
  `${PUZZLE_CHAIN_DIR}/04_reverse.txt`,
  `${PUZZLE_CHAIN_DIR}/05_atbash.txt`,
] as const;

/** Пароль, который нужно ввести после cat для открытия этого файла (не для 01). */
export const PUZZLE_FILE_PASSWORD: Record<string, string> = {
  [`${PUZZLE_CHAIN_DIR}/02_b64.txt`]: "OMEN-CHAIN-L2-B64",
  [`${PUZZLE_CHAIN_DIR}/03_hex.txt`]: "OMEN-CHAIN-L3-HEX",
  [`${PUZZLE_CHAIN_DIR}/04_reverse.txt`]: "OMEN-CHAIN-L4-REV",
  [`${PUZZLE_CHAIN_DIR}/05_atbash.txt`]: "OMEN-CHAIN-L5-ATB",
};

export function normalizePuzzlePassword(s: string): string {
  return s.trim();
}

export function puzzleChainIndex(fullPath: string): number {
  const n = PUZZLE_CHAIN_ORDER.indexOf(fullPath as (typeof PUZZLE_CHAIN_ORDER)[number]);
  return n;
}

export function isPuzzleChainFile(fullPath: string): boolean {
  return puzzleChainIndex(fullPath) >= 0;
}

/** Предыдущий файл в цепочке или null, если это первый или не из цепочки. */
export function puzzlePreviousInChain(fullPath: string): string | null {
  const i = puzzleChainIndex(fullPath);
  if (i <= 0) return null;
  return PUZZLE_CHAIN_ORDER[i - 1] ?? null;
}

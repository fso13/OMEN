import type { OutputLine, ShellState } from "./shell";

const STORAGE_KEY = "omen-terminal-save-v1";
const NOTES_KEY = "omen-terminal-notes-v1";

export interface PersistedGameV1 {
  v: 1;
  introComplete: boolean;
  /** false = письмо закрыто, но бут ещё не закончился (можно продолжить анимацию) */
  bootComplete: boolean;
  shell: ShellState;
  lines: OutputLine[];
  endScreen: { visible: boolean; text: string };
  /** История введённых команд (для `history`) */
  commandHistory?: string[];
}

export function loadGame(): PersistedGameV1 | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedGameV1;
    if (data.v !== 1 || typeof data.introComplete !== "boolean" || !data.shell) {
      return null;
    }
    if (data.introComplete && data.bootComplete === undefined) {
      (data as PersistedGameV1).bootComplete = true;
    }
    return data;
  } catch {
    return null;
  }
}

export function saveGame(state: PersistedGameV1): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadPlayerNotes(): string {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (raw == null) return "";
    return typeof raw === "string" ? raw : "";
  } catch {
    return "";
  }
}

export function savePlayerNotes(text: string): void {
  try {
    localStorage.setItem(NOTES_KEY, text);
  } catch {
    /* quota / private mode */
  }
}

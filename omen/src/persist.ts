const KEY = "omen-oracle-shadow-save-v1";

export interface PersistedPayload {
  version: 1;
  savedAt: string;
  gameJson: string;
}

export function saveGame(gameJson: string): void {
  try {
    const payload: PersistedPayload = {
      version: 1,
      savedAt: new Date().toISOString(),
      gameJson,
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

export function loadGame(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PersistedPayload;
    if (p.version !== 1 || typeof p.gameJson !== "string") return null;
    return p.gameJson;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

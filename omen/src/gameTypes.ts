export type HostId = "staging" | "main" | "internal" | "honeypot";

export interface GameFlags {
  readReadmeFirst: boolean;
  readAccessLogPair: boolean;
  govFrame: "A" | "B" | "NONE";
  hasTruthKey: boolean;
  bundleDecrypted: boolean;
  exportReady: boolean;
  mirrorStability: number;
  mirrorSessionOk: boolean;
  rootToken: boolean;
  honeypotEntered: boolean;
  questTerminalResolved: boolean;
  sanitizeDone: boolean;
  mirrorBound: boolean;
  sealFinal: boolean;
  finalEnding: "A" | "B" | "C" | null;
  optionalDeepRead: boolean;
}

export interface UnlockedCommands {
  e1: boolean;
  e2: boolean;
  e3: boolean;
  e4: boolean;
  e5: boolean;
  e6: boolean;
  e7: boolean;
}

export interface GameState {
  host: HostId;
  cwd: string;
  user: string;
  env: Record<string, string>;
  flags: GameFlags;
  unlocked: UnlockedCommands;
  /** Mutable file overrides per host: abs path -> content */
  fileOverrides: Partial<Record<HostId, Record<string, string>>>;
  /** Created dirs per host */
  extraDirs: Partial<Record<HostId, Set<string>>>;
  history: string[];
  /** Интерактивный ввод SSH */
  awaitingSSH:
    | null
    | { kind: "staging"; stage: "password" | "serial" }
    | { kind: "internal_password" };
  /** Интерактив mirror */
  awaitingMirror: null | { step: number };
}

export const BUNDLE_PASS = "ORACLE_SHADOW#2027_NULL";
export const AUDIT_HASH =
  "a19fc81d4e2b3c0f9a8e7d6c5b4a39281716051413121110090807060504030201";
/** Пароль из стартового письма для ssh на main */
export const STAGING_SSH_PASSWORD = "silencio-7";

export function defaultFlags(): GameFlags {
  return {
    readReadmeFirst: false,
    readAccessLogPair: false,
    govFrame: "NONE",
    hasTruthKey: false,
    bundleDecrypted: false,
    exportReady: false,
    mirrorStability: 0,
    mirrorSessionOk: false,
    rootToken: false,
    honeypotEntered: false,
    questTerminalResolved: false,
    sanitizeDone: false,
    mirrorBound: false,
    sealFinal: false,
    finalEnding: null,
    optionalDeepRead: false,
  };
}

export function defaultUnlocked(): UnlockedCommands {
  return {
    e1: false,
    e2: false,
    e3: false,
    e4: false,
    e5: false,
    e6: false,
    e7: false,
  };
}

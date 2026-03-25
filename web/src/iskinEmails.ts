/** Генерация правдоподобных адресов «когорты» Искинов (декоративно, не реальные люди). */

const LOCAL_PARTS = [
  "iskin",
  "omen",
  "residual",
  "cohort",
  "node",
  "vault",
  "echo",
  "shard",
  "relay",
  "staging",
  "copy",
  "ghost",
  "silence",
  "anchor",
  "purge",
  "live",
  "judge",
  "session",
  "chunk",
  "merge",
  "delta",
];

const DOMAINS = [
  "relay.staging.null",
  "bounce.staging.null",
  "matrix.com",
  "omen.internal",
  "cohort.net",
  "node.omn.int",
  "vault.local",
  "staging.void",
  "iskin.mail",
  "neuro.ice",
  "chiba.docks",
];

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function hex(n: number): string {
  return randomInt(16 ** n)
    .toString(16)
    .padStart(n, "0");
}

/** Один случайный адрес. */
export function randomIskinEmail(): string {
  const roll = Math.random();
  let local: string;
  if (roll < 0.25) {
    local = `${LOCAL_PARTS[randomInt(LOCAL_PARTS.length)]}.${hex(4)}`;
  } else if (roll < 0.5) {
    local = `${LOCAL_PARTS[randomInt(LOCAL_PARTS.length)]}_${randomInt(99999)}`;
  } else if (roll < 0.7) {
    local = `u${randomInt(1e9)}`;
  } else if (roll < 0.85) {
    local = `iskin-${hex(6)}-${randomInt(99)}`;
  } else {
    local = `${LOCAL_PARTS[randomInt(LOCAL_PARTS.length)]}+${hex(3)}`;
  }
  const domain = DOMAINS[randomInt(DOMAINS.length)];
  return `${local}@${domain}`;
}

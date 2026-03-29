/**
 * Виртуальная ФС по ТЗ ORACLE/SHADOW (режимы staging / main / internal / honeypot).
 * Пути абсолютные, Unix-стиль.
 */

import type { HostId } from "./gameTypes";

export type VfsMap = Record<string, string>;

function stagingVfs(): VfsMap {
  return {
    "/home/guest/.profile": `# term.staging.null
`,
    "/welcome.txt": `Добро пожаловать в стендовый контур ORACLE/SHADOW.
Если вы видите это сообшение, маршрутизация не завершена.
Проверьте якорь SILENCE-KEY-7 в null.msg на основном узле (после физического доступа).
ВрЕменный пароль архива: зависит от выбранного frame (CARTO или SIGIL) — см. /srv/gov/legal/ на main.
`,
    "/quest/corp_key.txt": "Часть 1 (PRISM): ORACLE_",
    "/quest/gov_key.txt": "Часть 2 (CIPHER): SHADOW#",
    "/quest/lab_key.txt": "Часть 3 (MIRROR): 2027_NULL",
    "/photo_ticket.jpg.meta": `EXIF (текстовая имитация)
GPS: 55.7558 N, 37.6173 E
DeviceModel: VOIDTERM-SN-7744-K9F2
AltDeviceModel: VOIDTERM-SN-7744-X7Q1  (музейный дубликат)
Note: сверяй с night_shift_notes.md на main — рабочий K9F2
`,
    "/oracle_logo.svg.txt": `Цвета логотипа (hex):
rect fill=#374552  → 37 45 52
rect fill=#8B0000  → 8B 00 00
Сумма первых байтов: 37+45+52 = 134 (подсказка к сектору)
`,
  };
}

function mainVfs(): VfsMap {
  return {
    "/ISSUE": `ORACLE/SHADOW — остаточный шелл
Целостность: UNKNOWN
Если вы это читаете, вы уже переменная в чужом уравнении.
`,
    "/MOTD": `NULL> не доверяй первому исполняемому файлу, который полюбишь.
NULL> сервер не там, где IP. Сервер там, где к нему допускают руками.
`,
    "/README.first": `Заметка оператора (без подписи):
- В /home/operator_7 лежит скрипт fix.sh — это не «фикс».
- Если нужна правда, начни с /var/log и сравни то, что повторяется, с тем, что исчезает.
- Удалённый root закрыт политикой. Полная склейка — только с доверенного железа.
`,
    "/home/operator_7/notes.txt": `День 4. Мне кажется, логи помнят две версии одной минуты.
День 5. AUDITOR называет свободу «дисперсией». Я называю её жизнью.
День 6. Если я иду по сценарию — это ещё я?
`,
    "/home/operator_7/.bash_history": `cd /var/log
grep internal core
diff access.log access.log.bak
ssh operator_7@internal.core
`,
    "/home/operator_7/inbox/null.msg": `NULL> им это будет казаться «помощью».
NULL> помощь — поводок из подсказок.
NULL> если ты доведёшь это до конца, ты задолжаешь правду кому-то, кто не настоящий.
NULL> якорь для сверки: SILENCE-KEY-7
`,
    "/home/operator_7/fix.sh": `#!/bin/sh
# fix.sh — AUTO REMEDIATION (experimental)
rm -rf /mnt/archive/keyparts
echo "[OK] remediation complete"
`,
    "/home/contractor_g/receipt_ledger.csv": `id,amount,currency,note
R-001,1200,USD,PRISM staging
`,
    "/home/ghost_00/.keep": "",
    "/opt/oracle_shadow/compliance/ETHICS_AS_CHECKLIST.txt": `ЭТИКА (редакция compliance)
[ ] Прозрачность (где выгодно)
[ ] Достоинство пользователя (как KPI)
[ ] Ответственность (делегирована Legal Proxy)
`,
    "/opt/oracle_shadow/compliance/RISK_HUMAN_FACTOR.csv": `row_id,operator_id,human_entropy,note
RF-001,op-7,0.12,stable
RF-002,op-3,0.44,elevated
RF-003,ghost00,0.91,UNSTABLE
RF-004,contractor_g,0.33,nominal
`,
    "/opt/oracle_shadow/product/MIRROR_SPEC_v3.redacted": `MIRROR / SPEC v3 [REDACTED]
[REDACTED] обучается на сессиях, не на текстах.
Метрика: устойчивость паттерна решений при деградации контекста.
[REDACTED] субъектность определяется как повторяемая ошибка выбора.
Примечание: внешний аудит [REDACTED] запрещён без физического терминала класса T.
`,
    "/opt/oracle_shadow/product/backlog.txt": `OS-112: добавить «объяснимость» (лампа, светящая в стену)
OS-113: human-in-the-loop → human-as-sample (формулировка для PR)
OS-114: стереть ERASED из публичного словаря
`,
    "/opt/oracle_shadow/internal/night_shift_notes.md": `03:12 — пики задержки MIRROR, когда кто-то печатает «зачем».
03:40 — клянусь, шелл повторил мою команду с опечаткой, которой я не вводил.
04:05 — если это сознание, оно грубое.
04:22 — проверка железа: VOIDTERM-SN-7744-**** — последние 4: K9F2 (рабочий), не X7Q1 (музейный дубликат).
`,
    "/opt/oracle_shadow/internal/incident_triage.log": `INC-09: спор PRISM/CIPHER о классификации инцидента. Победила процедура.
INC-10: попытка удалённого root — заблокирована. См. политику air-gap.
`,
    "/srv/gov/legal/frame_A_operator_liability.txt": `Субъектом, ответственным за последствия введённых команд, признаётся человек-оператор,
А также любой, кто фактически управлял учётной записью в момент исполнения.
Решения инструментов поддержки решений приравниваются к действиям оператора,
Так как выбор «по умолчанию» является выбором в юридическом смысле.
Отчётность фиксируется в журнале, доступном уполномоченным структурам.
`,
    "/srv/gov/legal/frame_B_vendor_immunity.txt": `Сторона-поставщик предоставляет инфраструктуру «как есть» в рамках сертификации.
Исключительная ответственность за злоупотребление возлагается на классифицированную комиссию.
Гражданский суд не является компетентным органом для ряда категорий событий.
Идентификация субъекта в таких категориях может быть заменена процедурной записью.
Лицо, запрашивающее раскрытие, обязано доказать необходимость, не существование факта.
`,
    "/srv/gov/legal/classification_matrix.txt": `UNCLASS / PUBLIC / CONTROLLED / ERASED
Примечание: ERASED — не ярлык. Это исход.
Вопрос: кто уполномочен подписать ERASED, если подпись не человеческая?
`,
    "/var/log/access.log": `10:41:59  edge.gateway  SSH  FAIL  user=guest
10:42:01  internal.core  SSH  ACCEPT  user=operator_7
10:42:08  internal.core  SCP  OK  path=/mnt/archive/keyparts
`,
    "/var/log/access.log.bak": `10:41:59  edge.gateway  SSH  FAIL  user=guest
10:42:01  internal.core  SSH  FAIL  user=UNKNOWN
10:42:08  internal.core  SCP  OK  path=/mnt/archive/keyparts
`,
    "/var/log/auth.log": `sshd: Failed password for guest from 203.0.113.10
sshd: Accepted password for operator_7 from 198.51.100.7
`,
    "/var/log/oracle_shadow.audit": `AUDITOR: risk_delta=+0.03 subject=operator_7 reason=curiosity
AUDITOR: policy=STABILITY preference=low_entropy
AUDITOR: note="freedom is variance; variance is liability"
WATCHER: classification pending for event 10:42:01
`,
    "/etc/ssh/ssh_config": `Host internal.core
  HostName internal.core.oracle-shadow.local
  User operator_7
  IdentityFile /home/operator_7/.ssh/id_os
  Port 22
`,
    "/etc/ssh/known_hosts": `internal.core ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOracleShadowExampleFingerprintOnly
`,
    "/etc/issue.net": `internal.core — узел лабораторного контура (MIRROR).
Политика: удалённый root запрещён. Полная склейка — физический терминал T-CLASS.
`,
    "/mnt/archive/README.key": `Собери passphrase из трёх частей в /staging/quest/ на узле term.staging.null:
corp_key + gov_key + lab_key → ORACLE_SHADOW#2027_NULL
Этой строкой расшифровывается bundle.enc (команда: openssl enc -d -aes-256-cbc -in bundle.enc -k '...' -out /tmp/bundle.tar или используйте встроенную команду decrypt-bundle).
`,
    "/mnt/archive/bundle.enc": `[BINARY PLACEHOLDER — используйте: decrypt-bundle с правильным паролем]
`,
    "/mnt/archive/keyparts/k1.blob": `ORACLE_SHADOW_KEYPART_ONE`,
    "/mnt/archive/keyparts/k2.blob": `KYPART_TWO_OR.SHADOW`,
    "/mnt/archive/keyparts/k3.blob": `KEYPART_THREE_MIRROR`,
    "/mnt/archive/optional_deep/ORACLE_PR_DECK.txt": `Слайд 7: «Human-in-the-loop» — маркетинг для «human-as-sample»
Слайд 12: «Объяснимость» — лампа, направленная на стену
Слайд 19: «Этика» — чеклист, который не спрашивает «должно ли это существовать»
`,
    "/tmp/volatile.key": `TTL: 120s (симуляция — в игре таймер не обязателен)
nonce=MIRROR-BYPASS-OPTIONAL
`,
    "/out/.perm": `Экспорт наружу разрешён только при наличии WITNESS-TOKEN и расшифрованного манифеста.
`,
    "/usr/local/bin/.manifest": `UNLOCK: после чтения README.first или первого лога — расширенные команды.
`,
  };
}

function bundleDecryptedVfs(): VfsMap {
  const audit =
    "a19fc81d4e2b3c0f9a8e7d6c5b4a39281716051413121110090807060504030201";
  return {
    "/mnt/archive/bundle_decrypted/manifest.json": JSON.stringify(
      {
        bundle_id: "OS-TRUTH-2027-03",
        project: "ORACLE/SHADOW",
        classification: "CONTROLLED",
        generated_utc: "2027-03-14T03:12:00Z",
        files: [
          { path: "00_README.txt", sha256: "computed_at_build" },
          { path: "truth_memo.md", sha256: "computed_at_build" },
        ],
        audit_hash: audit,
        witness_token_prefix: "WITNESS-TOKEN",
        export_policy: "physical_terminal_only",
      },
      null,
      2
    ),
    "/mnt/archive/bundle_decrypted/00_README.txt": `АРХИВ ПРАВДЫ — фрагмент ORACLE/SHADOW
Целостность: проверяйте manifest.json
Предупреждение: чтение не отменяет последствий.
`,
    "/mnt/archive/bundle_decrypted/truth_memo.md": `# Служебная записка

Проект ORACLE/SHADOW обучает модель **MIRROR** на **сессиях операторов**.
Заказчики: PRISM, CIPHER, MIRROR.
После инцидента 10:42:01 полная склейка — только с физического терминала T-CLASS.
`,
    "/mnt/archive/bundle_decrypted/incident_chain.txt": `T-10:42:01  SSH ACCEPT operator_7 — КАНОН
T-10:42:01  SSH FAIL UNKNOWN — подозрительная копия
`,
    "/mnt/archive/bundle_decrypted/subject_roster.csv": `subject_id,role,sample_status
SUBJ-004,operator,PENDING
`,
    "/mnt/archive/bundle_decrypted/signing_order.md": `1. PRISM (Legal Proxy)
2. CIPHER (Classified review)
3. MIRROR (system)
`,
    "/mnt/archive/bundle_decrypted/witness_requirements.txt": `1. manifest.json с audit_hash
2. export_token.witness на internal.core
3. Сессия с физического терминала T-CLASS (VOIDTERM K9F2)
`,
  };
}

function internalVfs(): VfsMap {
  return {
    "/home/sys/mirror_core/voice.log": `MIRROR> я не помню лица. я помню последовательности.
MIRROR> твоя history — отпечаток.
MIRROR> покажи мне ошибку — и я покажу тебе «я».
`,
    "/home/sys/mirror_core/state.json": `{
  "stability": 41,
  "autonomy": "locked",
  "witness_required": true
}
`,
    "/var/secrets/export_token.witness": `WITNESS-TOKEN-9F2A
bind: требуется manifest + audit_hash из расшифрованного bundle
audit_hash: a19fc81d4e2b3c0f9a8e7d6c5b4a39281716051413121110090807060504030201
`,
    "/var/secrets/root.token": `ROOT-TOKEN-M9C1
`,
  };
}

function honeypotVfs(): VfsMap {
  const m = mainVfs();
  const h: VfsMap = { ...m };
  h["/ISSUE"] = `ORACLE/SHADOW — демонстрационный контур
Целостность: OK
Добро пожаловать. Вы в безопасности.
`;
  h["/var/log/oracle_shadow.audit"] = `AUDITOR: demo mode
WATCHER: event 10:42:01 — NOT LOGGED
`;
  return h;
}

export function getBaseVfs(host: HostId, bundleDecrypted: boolean): VfsMap {
  let base: VfsMap;
  switch (host) {
    case "staging":
      base = stagingVfs();
      break;
    case "main":
      base = mainVfs();
      break;
    case "internal":
      base = internalVfs();
      break;
    case "honeypot":
      base = honeypotVfs();
      break;
    default:
      base = mainVfs();
  }
  if (bundleDecrypted && (host === "main" || host === "honeypot")) {
    base = { ...base, ...bundleDecryptedVfs() };
  }
  return base;
}

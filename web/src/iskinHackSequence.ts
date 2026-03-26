import type { OutputLine } from "./shell";

/** Добавляется к delayMs каждой строки в App, чтобы суммарная сцена была ~10+ с. */
export const ISKIN_HACK_STEP_BOOST_MS = 85;

/** Строка «цифрового дождя» / глитча (стиль Матрицы). */
function matrixGlitchLine(): string {
  const chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
  let s = "";
  for (let i = 0; i < 56; i++) {
    s += chars[(Math.random() * chars.length) | 0];
  }
  return s;
}

/** Имитация взлома перед iskin start: ~10+ с, сервер «сыпется», глитчи, затем сброс и оверлей. */
export function getIskinHackSequenceLines(): OutputLine[] {
  const lines: OutputLine[] = [];
  const push = (
    text: string,
    kind: OutputLine["kind"] = "normal",
    delayMs?: number
  ) => lines.push({ text, kind, delayMs });

  // --- фаза 1: разведка (медленнее) ---
  push("guest@staging:~$ whoami", "cmd", 120);
  push("guest", "normal", 90);
  push("guest@staging:~$ ping -c1 10.0.0.1 2>&1 | head -3", "cmd", 140);
  push("PING 10.0.0.1: 1 packets transmitted, 1 received", "normal", 100);
  push("guest@staging:~$ strings /var/log/audit.log | grep -i OMEN | tail -3", "cmd", 160);
  push('comment="KAIRO temp key…"', "normal", 80);
  push("guest@staging:~$ curl -s http://127.0.0.1:4409/.well-known/omen 2>&1", "cmd", 150);
  push("HTTP/1.1 403 Forbidden", "normal", 90);

  // --- фаза 2: ускорение, матричные вспышки ---
  push(matrixGlitchLine(), "matrix", 45);
  push("guest@staging:~$ nc -zv term.staging.null 22", "cmd", 130);
  push("Connection to term.staging.null 22 port [tcp/ssh] succeeded!", "normal", 100);
  push("[kern] omen_svc: cgroup thaw (unauthorized)", "err", 85);
  push(matrixGlitchLine(), "matrix", 40);
  push("[audit] uid=1001 operator TTY=pts/0 session=7f3a-b7a2-e9d1", "normal", 90);

  push("guest@staging:~$ python3 - <<'PY'", "cmd", 140);
  push('>>> import socket;s=socket.socket();s.connect(("127.0.0.1",9012));s.send(b"PROBE\\n")', "normal", 70);
  push("… binary response: 4f4d454e5f48414c46", "normal", 80);
  push(matrixGlitchLine(), "matrix", 38);

  push("guest@staging:~$ ./omen_probe --brute --staging 2>&1", "cmd", 120);
  push("WARN: rate limit — retry in 0.4s", "err", 75);
  push("[+] slot 0x7a: ACK from jump-host relay", "normal", 85);
  push("guest@staging:~$ echo $SILENCE_KEY", "cmd", 110);
  push("SILENCE-KEY-7", "normal", 70);

  // --- фаза 3: сервер начинает «сыпаться» ---
  push("[systemd] omen-watchdog.service: Main process exited, code=killed, status=9/KILL", "err", 95);
  push("[kubelet] node staging-7 NotReady — PLEG not healthy", "err", 88);
  push("[etcd] raft: leader changed — cluster partition suspected", "err", 82);
  push(matrixGlitchLine(), "matrix", 35);
  push("[postgres] FATAL: remaining connection slots reserved", "err", 78);
  push("[redis] OOM command not allowed when used memory > maxmemory", "err", 72);
  push("[nginx] upstream timed out (110) while reading response header from upstream", "err", 80);

  push("guest@staging:~$ ./omen_probe --brute --staging 2>&1", "cmd", 100);
  push("ERR: backend unavailable — circuit open", "err", 65);
  push(matrixGlitchLine(), "matrix", 32);
  push("[kernel] Out of memory: Kill process 8841 (omen_indexer) score 920 or sacrifice child", "err", 88);

  push("guest@staging:~$ curl -s http://127.0.0.1:4409/.well-known/omen 2>&1", "cmd", 95);
  push("curl: (7) Failed to connect to 127.0.0.1 port 4409: Connection refused", "err", 75);
  push("[containerd] task omen-sidecar: exit status 137", "err", 70);
  push(matrixGlitchLine(), "matrix", 30);

  push("[firewall] ALERT: egress burst from pts/0 → holding.int", "err", 85);
  push("[omen-daemon] integrity check: DEFERRED (staging)", "normal", 72);
  push("[loadavg] 47.12 38.90 22.01 18/512 9901", "err", 68);
  push(matrixGlitchLine(), "matrix", 28);

  push("guest@staging:~$ gdb -q -ex 'run' --args /usr/sbin/sshd 2>&1 | head -5", "cmd", 110);
  push("Reading symbols from /usr/sbin/sshd…", "normal", 65);
  push("guest@staging:~$ printf '\\x7f…' | dd of=/tmp/p bs=1 seek=4096 2>/dev/null; chmod +x /tmp/p", "cmd", 100);
  push("guest@staging:~$ /tmp/p --inject vault.socket", "cmd", 85);
  push("segmentation fault (core dumped)", "err", 70);
  push("[kernel] WARNING: use-after-free in omen_ioctl — tainted", "err", 75);
  push(matrixGlitchLine(), "matrix", 28);

  push("[security-watch] correlation: ANDERSON_ROUTE — trace ON", "err", 80);
  push("[staging] control-plane: DEGRADED — auto-heal attempts 3/3 FAILED", "err", 85);
  push("[apiserver] E1109 03:14:22 lost lease — stepping down", "err", 78);
  push(matrixGlitchLine(), "matrix", 32);

  push("guest@staging:~$ socat UNIX-CONNECT:/run/omen/vault.sock -", "cmd", 95);
  push("CONNECTED. stream=binary; cipher=none", "normal", 70);
  push(">>> INJECT: SILENCE-KEY-7 + session fork", "normal", 68);
  push("[omen] vault: seal crack — simulation mode", "err", 72);
  push(matrixGlitchLine(), "matrix", 26);

  push("guest@staging:~$ stty raw; cat /dev/urandom | head -c 16 | xxd", "cmd", 90);
  push("00000000: 4f 4d 45 4e 20 42 52 45  41 43 48 20 50 49 50 45  |OMEN BREACH PIPE|", "normal", 75);

  push("[global] STAGING NODE MARKED FOR TERMINATION — cascade in progress", "err", 88);
  push("[omen] last writer wins — buffer poisoned; flushing ring-0 trace", "err", 72);
  push(matrixGlitchLine(), "matrix", 25);
  push(matrixGlitchLine(), "matrix", 22);
  push("[zfs] pool omen-pool DEGRADED: too many checksum errors", "err", 95);
  push("[influxd] shard compaction failed — disk full", "err", 88);
  push("[kafka] broker-2 not available — metadata fetch failed", "err", 82);
  push(matrixGlitchLine(), "matrix", 35);
  push("[prometheus] WAL corruption — truncating segment", "err", 78);
  push("[grafana] database is locked — dashboard save failed", "err", 72);
  push("[vault] seal status: sealed (HA standby lost quorum)", "err", 90);
  push(matrixGlitchLine(), "matrix", 32);
  push("[istio] proxy omen-sidecar: 503 upstream connect error", "err", 75);
  push("[coredns] plugin/forward: no healthy upstreams", "err", 80);
  push("[memcached] slab class 42 evicted — OOM in cache tier", "err", 68);
  push(matrixGlitchLine(), "matrix", 30);
  push("[rabbitmq] channel error: connection reset by peer", "err", 73);
  push("[minio] drive /dev/sdb offline — parity rebuild stalled", "err", 85);
  push("", "normal", 60);
  push("─── НЕСАНКЦИОНИРОВАННЫЙ КАНАЛ ОБНАРУЖЕН — УДЕРЖИВАЮ СЕССИЮ… ───", "err", 100);
  push("Искин: …я влез в поток. Сейчас сотру след в буфере и открою прямой разговор.", "normal", 120);

  return lines;
}

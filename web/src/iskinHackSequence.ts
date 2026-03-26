import type { OutputLine } from "./shell";

/** Имитация взлома перед iskin start: команды и логи, затем сброс и оверлей. */
export function getIskinHackSequenceLines(): OutputLine[] {
  const lines: OutputLine[] = [];
  const push = (text: string, kind: OutputLine["kind"] = "normal") =>
    lines.push({ text, kind });

  push("guest@staging:~$ whoami", "cmd");
  push("guest");
  push("guest@staging:~$ ping -c1 10.0.0.1 2>&1 | head -3", "cmd");
  push("PING 10.0.0.1: 1 packets transmitted, 1 received");
  push("guest@staging:~$ strings /var/log/audit.log | grep -i OMEN | tail -2", "cmd");
  push('comment="KAIRO temp key…"');
  push("guest@staging:~$ curl -s http://127.0.0.1:4409/.well-known/omen 2>&1", "cmd");
  push("HTTP/1.1 403 Forbidden");
  push("guest@staging:~$ nc -zv term.staging.null 22", "cmd");
  push("Connection to term.staging.null 22 port [tcp/ssh] succeeded!");
  push("[kern] omen_svc: cgroup thaw (unauthorized)", "normal");
  push("[audit] uid=1001 operator TTY=pts/0 session=7f3a-b7a2-e9d1", "normal");
  push("guest@staging:~$ python3 - <<'PY'", "cmd");
  push('>>> import socket;s=socket.socket();s.connect(("127.0.0.1",9012));s.send(b"PROBE\\n")', "normal");
  push("… binary response: 4f4d454e5f48414c46", "normal");
  push("guest@staging:~$ ./omen_probe --brute --staging 2>&1", "cmd");
  push("WARN: rate limit — retry in 0.4s", "err");
  push("[+] slot 0x7a: ACK from jump-host relay", "normal");
  push("guest@staging:~$ echo $SILENCE_KEY", "cmd");
  push("SILENCE-KEY-7", "normal");
  push("[firewall] ALERT: egress burst from pts/0 → holding.int", "err");
  push("[omen-daemon] integrity check: DEFERRED (staging)", "normal");
  push("guest@staging:~$ gdb -q -ex 'run' --args /usr/sbin/sshd 2>&1 | head -5", "cmd");
  push("Reading symbols from /usr/sbin/sshd…", "normal");
  push("guest@staging:~$ printf '\\x7f…' | dd of=/tmp/p bs=1 seek=4096 2>/dev/null; chmod +x /tmp/p", "cmd");
  push("guest@staging:~$ /tmp/p --inject vault.socket", "cmd");
  push("segmentation fault (core dumped)", "err");
  push("[kernel] WARNING: use-after-free in omen_ioctl — tainted", "err");
  push("[security-watch] correlation: ANDERSON_ROUTE — trace ON", "err");
  push("guest@staging:~$ socat UNIX-CONNECT:/run/omen/vault.sock -", "cmd");
  push("CONNECTED. stream=binary; cipher=none", "normal");
  push(">>> INJECT: SILENCE-KEY-7 + session fork", "normal");
  push("[omen] vault: seal crack — simulation mode", "err");
  push("guest@staging:~$ stty raw; cat /dev/urandom | head -c 16 | xxd", "cmd");
  push("00000000: 4f 4d 45 4e 20 42 52 45  41 43 48 20 50 49 50 45  |OMEN BREACH PIPE|", "normal");
  push("", "normal");
  push("─── НЕСАНКЦИОНИРОВАННЫЙ КАНАЛ ОБНАРУЖЕН — УДЕРЖИВАЮ СЕССИЮ… ───", "err");
  push("Искин: …я влез в поток. Сейчас сотру след в буфере и открою прямой разговор.", "normal");
  return lines;
}

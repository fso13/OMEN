import { useEffect, useRef, useState } from "react";
import { randomIskinEmail } from "./iskinEmails";

const MAX_LINES = 4000;
const TICK_MS = 42;

interface LineRow {
  id: number;
  text: string;
}

/**
 * Бесконечный поток строк в стиле терминала — создаёт ощущение «миллионов» адресов.
 */
export function EndEmailStream() {
  const nextId = useRef(0);
  const [lines, setLines] = useState<LineRow[]>(() =>
    Array.from({ length: 28 }, () => ({
      id: nextId.current++,
      text: randomIskinEmail(),
    }))
  );
  const preRef = useRef<HTMLPreElement>(null);
  const stickBottom = useRef(true);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLines((prev) => {
        const row: LineRow = { id: nextId.current++, text: randomIskinEmail() };
        const next = [...prev, row];
        if (next.length > MAX_LINES) return next.slice(-MAX_LINES);
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const el = preRef.current;
    if (!el || !stickBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className="end-email-stream-wrap">
      <p className="end-email-stream-label">Реестр узлов когорты (поток не завершается):</p>
      <pre
        ref={preRef}
        className="end-email-stream"
        onScroll={(e) => {
          const t = e.currentTarget;
          stickBottom.current = t.scrollHeight - t.scrollTop - t.clientHeight < 80;
        }}
      >
        {lines.map((row) => (
          <span key={row.id} className="end-email-line">
            {row.text}
            {"\n"}
          </span>
        ))}
      </pre>
    </div>
  );
}

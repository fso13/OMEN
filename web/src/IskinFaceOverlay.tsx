import { useEffect, useState } from "react";

/** Полноэкранное «лицо» Искина (SHODAN-like): схематичное лицо, кабели, зелёное сияние. */
export function IskinFaceOverlay({ visible }: { visible: boolean }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setPhase(0);
    const id = window.setInterval(() => {
      setPhase((p) => p + 1);
    }, 3000);
    return () => window.clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  const jitter =
    phase % 4 === 0
      ? "translate(0, 0)"
      : phase % 4 === 1
        ? "translate(2px, -1px)"
        : phase % 4 === 2
          ? "translate(-2px, 2px)"
          : "translate(1px, 1px)";

  const glowPulse = phase % 2 === 0 ? 0.55 : 0.85;

  return (
    <div className="iskin-face-overlay" role="dialog" aria-modal="true" aria-label="Искин">
      <div className="iskin-face-vignette" />
      <div className="iskin-face-content" style={{ transform: jitter }}>
        <p className="iskin-face-title">ISKIN // прямой канал</p>
      
        <div className="iskin-face-loading">
          <span className="iskin-face-loading-dot">●</span>
          <span> загрузка личности… синхронизация с OMEN…</span>
        </div>
        <p className="iskin-face-hint">не отключайте терминал</p>
      </div>
    </div>
  );
}

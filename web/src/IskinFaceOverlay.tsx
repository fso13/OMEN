import { useEffect, useState } from "react";

/** Полноэкранное «лицо» Искина (отсылка к SHODAN) + микродвижение каждые 3 с. */
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

  return (
    <div className="iskin-face-overlay" role="dialog" aria-modal="true" aria-label="Искин">
      <div className="iskin-face-vignette" />
      <div className="iskin-face-content" style={{ transform: jitter }}>
        <p className="iskin-face-title">ISKIN // прямой канал</p>
        <svg
          className="iskin-face-svg"
          viewBox="0 0 220 260"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="iskinGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00ff41" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#003311" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          {/* контур «лица» — геометрия, не портрет */}
          <path
            className="iskin-face-outline"
            d="M110 28 L175 55 L188 120 L165 198 L110 228 L55 198 L32 120 L45 55 Z"
            fill="none"
            stroke="url(#iskinGlow)"
            strokeWidth="2"
          />
          {/* глаза */}
          <ellipse cx="82" cy="108" rx="18" ry="26" fill="none" stroke="#00ff41" strokeWidth="1.5" />
          <ellipse cx="138" cy="108" rx="18" ry="26" fill="none" stroke="#00ff41" strokeWidth="1.5" />
          <line x1="74" y1="108" x2="90" y2="108" stroke="#00ff41" strokeWidth="2" className="iskin-face-scan" />
          <line x1="130" y1="108" x2="146" y2="108" stroke="#00ff41" strokeWidth="2" className="iskin-face-scan" />
          {/* нос */}
          <path d="M110 128 L102 168 L118 168 Z" fill="none" stroke="#00ff41" strokeWidth="1" opacity="0.7" />
          {/* рот — сегменты */}
          <path
            d="M78 188 Q110 205 142 188"
            fill="none"
            stroke="#00ff41"
            strokeWidth="2"
            opacity="0.85"
          />
          <line x1="88" y1="194" x2="132" y2="194" stroke="#00ff41" strokeWidth="1" opacity="0.4" />
        </svg>
        <div className="iskin-face-loading">
          <span className="iskin-face-loading-dot">●</span>
          <span> загрузка личности… синхронизация с OMEN…</span>
        </div>
        <p className="iskin-face-hint">не отключайте терминал</p>
      </div>
    </div>
  );
}

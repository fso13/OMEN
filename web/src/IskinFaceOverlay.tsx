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
        <svg
          className="iskin-face-svg"
          viewBox="0 0 240 300"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="iskinGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c8ff4a" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#00ff41" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#003311" stopOpacity="0.35" />
            </linearGradient>
            <filter id="iskinBloom" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* лучи / «волосы» из кабелей */}
          <g
            className="iskin-face-wires"
            stroke="#00ff41"
            fill="none"
            strokeWidth="1.2"
            opacity={glowPulse}
          >
            <path d="M120 22 L95 8 L88 2" />
            <path d="M120 22 L120 0" />
            <path d="M120 22 L145 8 L152 2" />
            <path d="M75 45 L45 25 L30 15" />
            <path d="M165 45 L195 25 L210 15" />
            <path d="M55 95 L25 75 L10 60" />
            <path d="M185 95 L215 75 L230 60" />
            <path d="M50 150 L15 140 L0 135" />
            <path d="M190 150 L225 140 L240 135" />
          </g>
          {/* контур лица */}
          <path
            className="iskin-face-outline"
            d="M120 38 L182 62 L198 118 L178 205 L120 242 L62 205 L42 118 L58 62 Z"
            fill="none"
            stroke="url(#iskinGlow)"
            strokeWidth="2"
            filter="url(#iskinBloom)"
          />
          {/* схематичные «дорожки» на щеках */}
          <path
            d="M58 118 L72 125 L68 138 L78 152"
            fill="none"
            stroke="#00ff41"
            strokeWidth="0.6"
            opacity="0.5"
          />
          <path
            d="M182 118 L168 125 L172 138 L162 152"
            fill="none"
            stroke="#00ff41"
            strokeWidth="0.6"
            opacity="0.5"
          />
          {/* глаза — узкие, с вертикальным зрачком */}
          <ellipse cx="88" cy="118" rx="20" ry="28" fill="none" stroke="#00ff41" strokeWidth="1.5" />
          <ellipse cx="152" cy="118" rx="20" ry="28" fill="none" stroke="#00ff41" strokeWidth="1.5" />
          <line x1="88" y1="98" x2="88" y2="138" stroke="#c8ff4a" strokeWidth="2.5" className="iskin-face-pupil" />
          <line x1="152" y1="98" x2="152" y2="138" stroke="#c8ff4a" strokeWidth="2.5" className="iskin-face-pupil" />
          <line x1="78" y1="118" x2="98" y2="118" stroke="#00ff41" strokeWidth="1.2" className="iskin-face-scan" />
          <line x1="142" y1="118" x2="162" y2="118" stroke="#00ff41" strokeWidth="1.2" className="iskin-face-scan" />
          {/* нос */}
          <path d="M120 138 L110 182 L130 182 Z" fill="none" stroke="#00ff41" strokeWidth="1" opacity="0.65" />
          {/* рот */}
          <path
            d="M82 208 Q120 228 158 208"
            fill="none"
            stroke="#00ff41"
            strokeWidth="2"
            opacity="0.9"
          />
          <line x1="92" y1="214" x2="148" y2="214" stroke="#00ff41" strokeWidth="0.8" opacity="0.35" />
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

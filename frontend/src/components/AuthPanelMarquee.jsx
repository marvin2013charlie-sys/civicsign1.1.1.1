import React from "react";

const ROW_COUNT = 10;

const ROWS = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i + 1,
  reverse: i % 2 === 1,
  duration: 34 + (i % 5) * 9,
  top: `${4 + i * (92 / (ROW_COUNT - 1))}%`,
  opacity: 0.028 + (i % 4) * 0.008,
}));

const WORDS_PER_CHUNK = 10;

function MarqueeChunk() {
  return (
    <span className="cs-auth-marquee-chunk">
      {Array.from({ length: WORDS_PER_CHUNK }).map((_, i) => (
        <span key={i} className="cs-auth-marquee-word">
          CivicSign
        </span>
      ))}
    </span>
  );
}

/** Animated CivicSign watermark rows on the teal auth panel (login / register). */
export function AuthPanelMarquee() {
  return (
    <div className="cs-auth-panel-marquee" aria-hidden data-testid="auth-panel-marquee">
      <div className="cs-auth-panel-sweep" />
      {ROWS.map((row) => (
        <div
          key={row.id}
          className="cs-auth-marquee-row"
          style={{ "--marquee-opacity": row.opacity, top: row.top }}
        >
          <div
            className={`cs-auth-marquee-track ${row.reverse ? "cs-auth-marquee-reverse" : ""}`}
            style={{ "--marquee-duration": `${row.duration}s` }}
          >
            <MarqueeChunk />
            <MarqueeChunk />
          </div>
        </div>
      ))}
    </div>
  );
}
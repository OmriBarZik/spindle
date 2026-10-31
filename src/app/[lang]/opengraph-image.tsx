import { ImageResponse } from "next/og";
import { LOCALES } from "@/i18n/config";

// Link preview image: the Spindle record, the same one that spins on the home page
// and the game screens. Text-free apart from the Latin wordmark, so one design works
// for both languages (the bundled og font has no Hebrew glyphs).

export const alt = "Spindle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

const BACKGROUND = "#0b0b10";
const LABEL = "#8b5cf6";
const RECORD = 500;

function Record() {
  const r = RECORD / 2;
  const grooves = [];
  for (let gr = r * 0.4; gr < r - 6; gr += 7) {
    grooves.push(
      <circle key={gr} cx={r} cy={r} r={gr} fill="none" stroke="#1d1d1d" strokeWidth={2} />,
    );
  }
  return (
    <svg width={RECORD} height={RECORD} viewBox={`0 0 ${RECORD} ${RECORD}`}>
      <defs>
        <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.75" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx={r} cy={r} r={r} fill="#000" />
      <circle cx={r} cy={r} r={r - 3} fill="#111" />
      {grooves}
      <circle
        cx={r}
        cy={r}
        r={r * 0.31}
        fill="none"
        stroke="#fff"
        strokeOpacity={0.05}
        strokeWidth={3}
      />
      <circle cx={r} cy={r} r={r - 3} fill="url(#sheen)" />
      <circle cx={r} cy={r} r={r * 0.36} fill={LABEL} />
      <circle cx={r} cy={r} r={r * 0.036} fill={BACKGROUND} />
    </svg>
  );
}

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 72,
        background: `radial-gradient(900px 500px at 50% -120px, #2a1846 0%, ${BACKGROUND} 70%)`,
        color: "#f4f4f5",
      }}
    >
      <div
        style={{
          display: "flex",
          borderRadius: 9999,
          boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
        }}
      >
        <Record />
      </div>
      <div style={{ display: "flex", fontSize: 120, fontWeight: 900, letterSpacing: -4 }}>
        Spindle
      </div>
    </div>,
    size,
  );
}

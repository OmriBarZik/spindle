import { ImageResponse } from "next/og";
import { LOCALES } from "@/i18n/config";
import { RECORD_BACKGROUND, RecordSvg } from "@/lib/recordSvg";

// Link preview image: the Spindle record, the same one that spins on the home page
// and the game screens. Text-free apart from the Latin wordmark, so one design works
// for both languages (the bundled og font has no Hebrew glyphs).

export const alt = "Spindle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

const RECORD = 500;

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
        background: `radial-gradient(900px 500px at 50% -120px, #2a1846 0%, ${RECORD_BACKGROUND} 70%)`,
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
        <RecordSvg size={RECORD} grooveGap={7} />
      </div>
      <div style={{ display: "flex", fontSize: 120, fontWeight: 900, letterSpacing: -4 }}>
        Spindle
      </div>
    </div>,
    size,
  );
}

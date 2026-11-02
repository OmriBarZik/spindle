import { ImageResponse } from "next/og";
import { RecordSvg } from "@/components/RecordSvg";
import { localeParams } from "@/i18n/config";
import { PALETTE } from "@/lib/palette";

// Link preview image: the Spindle record, the same one that spins on the home page
// and the game screens. Text-free apart from the Latin wordmark, so one design works
// for both languages (the bundled og font has no Hebrew glyphs).

export const alt = "Spindle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return localeParams();
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
        background: `radial-gradient(900px 500px at 50% -120px, ${PALETTE.glow} 0%, ${PALETTE.page} 70%)`,
        color: PALETTE.ink,
      }}
    >
      <div
        style={{
          display: "flex",
          borderRadius: 9999,
          boxShadow: `0 30px 80px ${PALETTE.shadow}`,
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

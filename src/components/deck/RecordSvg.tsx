import { PALETTE } from "@/lib/display/palette";

// The Spindle record as SVG, shared by the link preview image and the favicon.
// (The in-page record is plain CSS: `.record` in styles/record.css.)

const R = 250; // drawn in a 500 x 500 box, scaled to `size`

export function RecordSvg({
  size,
  grooveGap,
  grooveWidth = 2,
}: {
  size: number;
  /** Distance between grooves in the 500-unit box. Wider gaps read better when small. */
  grooveGap: number;
  grooveWidth?: number;
}) {
  const grooves = [];
  for (let gr = R * 0.4; gr < R - 6; gr += grooveGap) {
    grooves.push(
      <circle
        key={gr}
        cx={R}
        cy={R}
        r={gr}
        fill="none"
        stroke={PALETTE.vinylGroove}
        strokeWidth={grooveWidth}
      />,
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 500 500">
      <defs>
        <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={PALETTE.white} stopOpacity="0" />
          <stop offset="0.3" stopColor={PALETTE.white} stopOpacity="0.08" />
          <stop offset="0.45" stopColor={PALETTE.white} stopOpacity="0" />
          <stop offset="0.6" stopColor={PALETTE.white} stopOpacity="0" />
          <stop offset="0.75" stopColor={PALETTE.white} stopOpacity="0.06" />
          <stop offset="1" stopColor={PALETTE.white} stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx={R} cy={R} r={R} fill={PALETTE.black} />
      <circle cx={R} cy={R} r={R - 3} fill={PALETTE.vinyl} />
      {grooves}
      <circle
        cx={R}
        cy={R}
        r={R * 0.31}
        fill="none"
        stroke={PALETTE.white}
        strokeOpacity={0.05}
        strokeWidth={3}
      />
      <circle cx={R} cy={R} r={R - 3} fill="url(#sheen)" />
      <circle cx={R} cy={R} r={R * 0.36} fill={PALETTE.label} />
      <circle cx={R} cy={R} r={R * 0.036} fill={PALETTE.page} />
    </svg>
  );
}

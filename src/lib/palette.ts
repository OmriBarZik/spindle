// The raw colours that code outside CSS needs: the link preview image and the favicon
// (drawn by next/og, which can't read CSS variables) and the browser's theme colour.
// They mirror `--palette-*` in src/app/styles/tokens.css: change both together.
// This is the only TypeScript file allowed colour literals (`spindle/no-raw-style`).

export const PALETTE = {
  white: "#fff",
  black: "#000",
  page: "#0b0b10",
  pageLight: "#f7f7fb",
  ink: "#f4f4f5",
  glow: "#2a1846",
  label: "#8b5cf6",
  vinyl: "#111",
  vinylGroove: "#1d1d1d",
  shadow: "rgba(0,0,0,0.7)",
} as const;

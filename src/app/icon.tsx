import { ImageResponse } from "next/og";
import { RecordSvg } from "@/lib/recordSvg";

// Favicon: the same record as the link preview image, with fewer, thicker grooves so it
// reads at 32px.

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<RecordSvg size={size.width} grooveGap={45} grooveWidth={12} />, size);
}

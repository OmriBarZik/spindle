"use client";

import type { ReactNode } from "react";
import { useDesign } from "@/lib/design";

/**
 * Lays out the record, the line and the "Place it" button for the chosen design.
 * Each design keeps the record in one fixed spot, so the hidden player is never
 * remounted mid-game.
 */
export default function PlayArea({
  deck,
  line,
  place,
}: {
  deck: ReactNode;
  line: ReactNode;
  place: ReactNode;
}) {
  const design = useDesign();

  if (design === "compact") {
    // A small record pinned to the top: replay the song from anywhere on the line.
    return (
      <>
        <div className="sticky top-0 z-10 -mx-4 border-b border-line bg-background/95 px-4 py-2 backdrop-blur empty:hidden">
          {deck}
        </div>
        {line}
        {place}
      </>
    );
  }

  if (design === "dock") {
    // The line scrolls under a bar pinned to the bottom with the record and "Place it".
    return (
      <>
        {line}
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-line bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur empty:hidden">
          {deck}
          {place}
        </div>
      </>
    );
  }

  return (
    <>
      {deck}
      {line}
      {place}
    </>
  );
}

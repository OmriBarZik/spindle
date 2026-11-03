"use client";

import { useEffect, useEffectEvent } from "react";
import { directionSign } from "@/lib/line/directionSign";

/**
 * Arrow keys move the record from anywhere on the page, not just with the line
 * focused. Left and right follow the screen, so they swap on right-to-left pages.
 */
export function useSwipeKeys({
  choosing,
  count,
  onStep,
  onSlot,
}: {
  choosing: boolean;
  count: number;
  onStep: (delta: number) => void;
  onSlot: (slot: number) => void;
}) {
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    // Alt+Left is the browser's Back, and so on: those keys aren't ours.
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
      return;
    }
    const rtl = directionSign(document.documentElement) === -1;
    if (e.key === (rtl ? "ArrowLeft" : "ArrowRight")) {
      onStep(1);
    } else if (e.key === (rtl ? "ArrowRight" : "ArrowLeft")) {
      onStep(-1);
    } else if (e.key === "Home") {
      onSlot(0);
    } else if (e.key === "End") {
      onSlot(count);
    } else {
      return;
    }
    e.preventDefault();
  });

  useEffect(() => {
    if (!choosing) {
      return;
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [choosing]);
}

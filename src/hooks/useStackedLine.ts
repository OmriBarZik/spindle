"use client";

import { useMemo } from "react";
import { clamp } from "@/lib/clamp";
import type { LiveSlot } from "@/lib/liveSlot";
import {
  gapToSlot,
  slotToGap,
  stackedLive,
  stackLine,
  stackOfCard,
  stackSizes,
} from "@/lib/stacks";
import type { LineItem } from "@/lib/timeline";

/**
 * The line as the strip shows it: songs from the same year stacked (`stacks.ts`). The
 * strip counts in gaps between stacks, while the game counts in card slots; this
 * converts `slot`, `focus`, `live` and `onSlot` from one to the other.
 */
export function useStackedLine({
  items,
  slot,
  focus,
  live,
  onSlot,
}: {
  items: readonly LineItem[];
  slot: number | null;
  focus: number;
  live: LiveSlot;
  onSlot: (slot: number) => void;
}) {
  const stacks = stackLine(items);
  // Kept stable while the line's shape stays the same, so the strip's effects don't re-run.
  const shape = stackSizes(items).join(" ");
  const sizes = useMemo(() => shape.split(" ").map(Number), [shape]);
  const gapLive = useMemo(() => stackedLive(live, sizes), [live, sizes]);
  const gap = slot === null ? null : slotToGap(sizes, slot);
  const onGap = (g: number) => onSlot(gapToSlot(sizes, g));

  /** Moves the record `delta` gaps along, from where the strip has it now. */
  function step(delta: number) {
    const from = gapLive.get() ?? gap;
    if (from === null) {
      return;
    }
    const next = clamp(from + delta, 0, stacks.length);
    if (next !== from) {
      onGap(next);
    }
  }

  return {
    stacks,
    sizes,
    gap,
    focusStack: stackOfCard(sizes, focus),
    gapLive,
    onGap,
    step,
    // Each stack's first card, or its starting year: what the overview bar marks.
    faces: stacks.flatMap((stack) => stack.find((item) => !item.song) ?? stack.slice(0, 1)),
  };
}

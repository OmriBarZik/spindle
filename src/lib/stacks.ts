import type { LiveSlot } from "./liveSlot";

/**
 * Songs from the same year sit on the line as one stack of cards, with one spot on the
 * time rail, instead of two dots side by side. The strip then has a gap only between
 * stacks: a gap inside a stack would mean the same as the gaps either side of it (equal
 * years are right on either side), so it's left out.
 *
 * The games still count in card slots (slot `i` = before card `i`); these convert
 * between those and the strip's gaps (gap `g` = before stack `g`).
 */

/** Runs of neighbouring cards with the same year, in order. */
export function stackLine<T extends { year: number }>(cards: readonly T[]): T[][] {
  const stacks: T[][] = [];
  for (const card of cards) {
    const last = stacks.at(-1);
    if (last?.[0]?.year === card.year) {
      last.push(card);
    } else {
      stacks.push([card]);
    }
  }
  return stacks;
}

/** How many cards each stack holds: all the conversions need. */
export function stackSizes(cards: readonly { year: number }[]): number[] {
  return stackLine(cards).map((s) => s.length);
}

/** The card slot of gap `gap`: before the first card of stack `gap`. */
export function gapToSlot(sizes: readonly number[], gap: number): number {
  let slot = 0;
  for (let i = 0; i < gap && i < sizes.length; i++) {
    slot += sizes[i] ?? 0;
  }
  return slot;
}

/** The gap of card slot `slot`. A slot inside a stack goes to the gap after it. */
export function slotToGap(sizes: readonly number[], slot: number): number {
  let start = 0;
  for (const [i, size] of sizes.entries()) {
    if (slot <= start) {
      return i;
    }
    start += size;
  }
  return sizes.length;
}

/** The stack that holds card `index`. */
export function stackOfCard(sizes: readonly number[], index: number): number {
  let end = 0;
  for (const [i, size] of sizes.entries()) {
    end += size;
    if (index < end) {
      return i;
    }
  }
  return Math.max(0, sizes.length - 1);
}

/** Which card of stack `i` shows first: card `focus` if it's in there, else the last. */
export function stackFront(sizes: readonly number[], i: number, focus: number): number {
  const start = gapToSlot(sizes, i);
  const size = sizes[i] ?? 1;
  return focus >= start && focus < start + size ? focus - start : size - 1;
}

/**
 * The live gap seen from the strip: the same store, which keeps card slots (for the
 * place button), read and written in gaps.
 */
export function stackedLive(live: LiveSlot, sizes: readonly number[]): LiveSlot {
  return {
    get: () => {
      const slot = live.get();
      return slot === null ? null : slotToGap(sizes, slot);
    },
    set: (gap) => live.set(gap === null ? null : gapToSlot(sizes, gap)),
    subscribe: live.subscribe,
  };
}

import type { SongRef } from "./songs";

type Dated = { year: number };

/** One card on the swipe line: a song, or the starting year (`song: null`). */
export type LineItem = {
  key: string;
  year: number;
  song: SongRef | null;
  variant?: "plain" | "good" | "bad";
  note?: string;
};

/** The gap the record starts on: the middle of the line. */
function defaultSlot(count: number): number {
  return Math.ceil(count / 2);
}

/** The gap the record is on: beside the song just placed while it glows, else the player's. */
export function recordSlot(
  swapping: boolean,
  lastAt: number,
  slot: number | null,
  cards: number,
): number {
  return swapping && lastAt >= 0 ? lastAt + 1 : (slot ?? defaultSlot(cards));
}

/**
 * Slot `i` means "insert before cards[i]" (slot === cards.length is the end).
 * Equal years count as correct on either side, like the card game.
 */
export function isSlotCorrect(cards: readonly Dated[], slot: number, year: number): boolean {
  const before = cards[slot - 1];
  const after = cards[slot];
  return (!before || before.year <= year) && (!after || year <= after.year);
}

export function correctSlot(cards: readonly Dated[], year: number): number {
  const idx = cards.findIndex((c) => c.year > year);
  return idx === -1 ? cards.length : idx;
}

export type SlotLabels = {
  anywhere: string;
  before: (year: number) => string;
  after: (year: number) => string;
  in: (year: number) => string;
  between: (from: number, to: number) => string;
};

/** Text for a gap on the line, e.g. "Before 1994" or "1997 – 2000". */
export function slotLabel(cards: readonly Dated[], slot: number, labels: SlotLabels): string {
  const before = cards[slot - 1];
  const after = cards[slot];
  if (!before) {
    return after ? labels.before(after.year) : labels.anywhere;
  }
  if (!after) {
    return labels.after(before.year);
  }
  if (before.year === after.year) {
    return labels.in(before.year);
  }
  return labels.between(before.year, after.year);
}

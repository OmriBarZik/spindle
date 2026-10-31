import type { Song } from "./songs";

export type TimelineCard = {
  id: string;
  title: string;
  artist: string;
  year: number;
  youtubeId: string;
  /** The free starting-year card a timeline begins with (not a song). */
  anchor?: boolean;
};

type Dated = { year: number };

export function anchorCard(year: number): TimelineCard {
  return { id: `anchor:${year}`, title: "", artist: "", year, youtubeId: "", anchor: true };
}

/** The card saved on a timeline for a song (English names only; see `songNames`). */
export function songCard(song: Song): TimelineCard {
  const { id, title, artist, year, youtubeId } = song;
  return { id, title, artist, year, youtubeId };
}

/** Number of songs (not counting the starting year) on a timeline. */
export function songCount(cards: readonly TimelineCard[]): number {
  return cards.filter((c) => !c.anchor).length;
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
  if (!before) return after ? labels.before(after.year) : labels.anywhere;
  if (!after) return labels.after(before.year);
  if (before.year === after.year) return labels.in(before.year);
  return labels.between(before.year, after.year);
}

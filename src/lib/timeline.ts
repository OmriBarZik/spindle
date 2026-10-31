export type TimelineCard = {
  id: string;
  title: string;
  artist: string;
  year: number;
  youtubeId: string;
  /** The free starting-year card a timeline begins with (not a song). */
  anchor?: boolean;
};

export function anchorCard(year: number): TimelineCard {
  return { id: `anchor:${year}`, title: "", artist: "", year, youtubeId: "", anchor: true };
}

/** Number of songs (not counting the starting year) on a timeline. */
export function songCount(cards: readonly TimelineCard[]): number {
  return cards.filter((c) => !c.anchor).length;
}

/**
 * Slot `i` means "insert before cards[i]" (slot === cards.length is the end).
 * Equal years count as correct on either side, like the card game.
 */
export function isSlotCorrect(
  cards: readonly { year: number }[],
  slot: number,
  year: number,
): boolean {
  const before = cards[slot - 1];
  const after = cards[slot];
  return (!before || before.year <= year) && (!after || year <= after.year);
}

export function correctSlot(cards: readonly { year: number }[], year: number): number {
  const idx = cards.findIndex((c) => c.year > year);
  return idx === -1 ? cards.length : idx;
}

export function slotLabel(cards: readonly { year: number }[], slot: number): string {
  const before = cards[slot - 1];
  const after = cards[slot];
  if (!before && !after) return "Anywhere";
  if (!before) return `Before ${after.year}`;
  if (!after) return `After ${before.year}`;
  if (before.year === after.year) return `In ${before.year}`;
  return `${before.year} – ${after.year}`;
}

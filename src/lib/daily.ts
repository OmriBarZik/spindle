import { seededShuffle } from "./random";
import { SONGS, type Song } from "./songs";

export const SORT_SIZE = 5;

/**
 * The 5 songs for the daily "Sort" puzzle. Everyone gets the same songs on the
 * same calendar day. Years are kept distinct so there is exactly one right order.
 */
export function sortSongsFor(day: string): Song[] {
  const picked: Song[] = [];
  const years = new Set<number>();
  for (const song of seededShuffle(SONGS, `sort:${day}`)) {
    if (years.has(song.year)) continue;
    picked.push(song);
    years.add(song.year);
    if (picked.length === SORT_SIZE) break;
  }
  return picked;
}

/** Starting order shown to the player — never already solved. */
export function initialSortOrder(day: string): string[] {
  const songs = sortSongsFor(day);
  for (let attempt = 0; attempt < 10; attempt++) {
    const order = seededShuffle(songs, `sort-order:${day}:${attempt}`);
    if (!isSorted(order)) return order.map((s) => s.id);
  }
  return songs
    .slice()
    .sort((a, b) => b.year - a.year)
    .map((s) => s.id);
}

function isSorted(songs: Song[]): boolean {
  return songs.every((s, i) => i === 0 || songs[i - 1].year <= s.year);
}

/**
 * Pick the daily "Timeline" song. The day's sort songs are excluded (no spoilers),
 * as are songs already on the player's timeline and any songs they skipped
 * because the video couldn't play.
 */
export function timelineSongFor(
  day: string,
  exclude: ReadonlySet<string>,
): Song | undefined {
  const sortIds = new Set(sortSongsFor(day).map((s) => s.id));
  return seededShuffle(SONGS, `timeline:${day}`).find(
    (s) => !sortIds.has(s.id) && !exclude.has(s.id),
  );
}

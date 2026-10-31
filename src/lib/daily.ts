import { seededShuffle } from "./random";
import { SONGS, type Song } from "./songs";

export const SORT_SIZE = 5;

/**
 * The 5 songs for the "Daily Five" puzzle, in the order they are played. Everyone
 * gets the same songs on the same calendar day. Years are kept distinct.
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

/**
 * The starting year card for the daily five, e.g. 1980. Taken from another song
 * in the catalog (so it's a realistic year) whose year differs from all five.
 */
export function anchorYearFor(day: string): number {
  const used = new Set(sortSongsFor(day).map((s) => s.year));
  const pick = seededShuffle(SONGS, `anchor:${day}`).find((s) => !used.has(s.year));
  return pick?.year ?? 1990;
}

/** Starting year for a new Daily Timeline, different from the first song's year. */
export function timelineAnchorYearFor(day: string, songYear: number): number {
  const pick = seededShuffle(SONGS, `timeline-anchor:${day}`).find((s) => s.year !== songYear);
  return pick?.year ?? 1990;
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

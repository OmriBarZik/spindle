import { hashString, mulberry32, seededShuffle } from "./random";
import { SONG_LANGUAGES, SONGS, songLanguage, type Song, type SongLanguage } from "./songs";

export const SORT_SIZE = 5;

/**
 * The day's song order for the player's chosen languages.
 *
 * Each language keeps its own order from the one seeded shuffle, then the lists are
 * interleaved: every next song comes from one of the chosen languages with equal odds
 * (a second seeded coin, `${seed}:mix`), whatever their catalog sizes. So with
 * International and Israeli songs both on, about half the picks are each. When a
 * language runs out, the rest come from the others.
 *
 * Nothing here depends on anything but the seed and the setting: players with the same
 * setting (both on is the default) get the same puzzle.
 */
function shuffled(seed: string, langs: readonly SongLanguage[] = SONG_LANGUAGES): Song[] {
  const all = seededShuffle(SONGS, seed);
  const queues = SONG_LANGUAGES.filter((l) => langs.includes(l))
    .map((l) => all.filter((s) => songLanguage(s) === l))
    .filter((q) => q.length > 0);
  if (queues.length === 0) return langs === SONG_LANGUAGES ? all : shuffled(seed);
  if (queues.length === 1) return queues[0];

  const coin = mulberry32(hashString(`${seed}:mix`));
  const out: Song[] = [];
  const heads = queues.map(() => 0);
  let live = queues.map((_, i) => i);
  while (live.length > 0) {
    const q = live[Math.floor(coin() * live.length)];
    out.push(queues[q][heads[q]++]);
    if (heads[q] === queues[q].length) live = live.filter((i) => i !== q);
  }
  return out;
}

/**
 * The 5 songs for the "Daily Five" puzzle, in the order they are played. Everyone
 * gets the same songs on the same calendar day. Years are kept distinct.
 */
export function sortSongsFor(day: string, langs?: readonly SongLanguage[]): Song[] {
  const picked: Song[] = [];
  const years = new Set<number>();
  for (const song of shuffled(`sort:${day}`, langs)) {
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
export function anchorYearFor(day: string, langs?: readonly SongLanguage[]): number {
  const used = new Set(sortSongsFor(day, langs).map((s) => s.year));
  const pick = shuffled(`anchor:${day}`, langs).find((s) => !used.has(s.year));
  return pick?.year ?? 1990;
}

/** Starting year for a new Daily Timeline, different from the first song's year. */
export function timelineAnchorYearFor(
  day: string,
  songYear: number,
  langs?: readonly SongLanguage[],
): number {
  const pick = shuffled(`timeline-anchor:${day}`, langs).find((s) => s.year !== songYear);
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
  langs?: readonly SongLanguage[],
): Song | undefined {
  const sortIds = new Set(sortSongsFor(day, langs).map((s) => s.id));
  const ok = (s: Song) => !sortIds.has(s.id) && !exclude.has(s.id);
  // If the chosen languages run out (a very long run), fall back to any song.
  return shuffled(`timeline:${day}`, langs).find(ok) ?? shuffled(`timeline:${day}`).find(ok);
}

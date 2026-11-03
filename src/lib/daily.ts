import { type Locale, LOCALES } from "@/i18n/config";
import { hashString, mulberry32, seededShuffle } from "./random";
import { type Song, songLanguage, SONGS } from "./songs";

export const SORT_SIZE = 5;

/** Starting year if the catalog somehow has no other year to offer. */
const FALLBACK_YEAR = 1990;

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
function shuffled(seed: string, langs: readonly Locale[] = LOCALES): Song[] {
  const all = seededShuffle(SONGS, seed);
  const queues = LOCALES.filter((l) => langs.includes(l))
    .map((l) => all.filter((s) => songLanguage(s) === l))
    .filter((q) => q.length > 0);
  if (queues.length === 0) {
    return langs === LOCALES ? all : shuffled(seed);
  }
  const [first] = queues;
  if (queues.length === 1 && first) {
    return first;
  }

  const coin = mulberry32(hashString(`${seed}:mix`));
  const out: Song[] = [];
  let live = queues.map((songs) => ({ songs, next: 0 }));
  while (live.length > 0) {
    const pick = live[Math.floor(coin() * live.length)];
    const song = pick?.songs[pick.next++];
    if (!pick || !song) {
      break;
    }
    out.push(song);
    if (pick.next === pick.songs.length) {
      live = live.filter((q) => q !== pick);
    }
  }
  return out;
}

/**
 * The 5 songs for the "Daily Five" puzzle, in the order they are played. Everyone
 * gets the same songs on the same calendar day. Years are kept distinct.
 */
export function sortSongsFor(day: string, langs?: readonly Locale[]): Song[] {
  const picked: Song[] = [];
  const years = new Set<number>();
  for (const song of shuffled(`sort:${day}`, langs)) {
    if (years.has(song.year)) {
      continue;
    }
    picked.push(song);
    years.add(song.year);
    if (picked.length === SORT_SIZE) {
      break;
    }
  }
  return picked;
}

/**
 * The starting year card for the daily five, e.g. 1980. Taken from another song
 * in the catalog (so it's a realistic year) whose year differs from all five.
 */
export function anchorYearFor(day: string, langs?: readonly Locale[]): number {
  const used = new Set(sortSongsFor(day, langs).map((s) => s.year));
  const pick = shuffled(`anchor:${day}`, langs).find((s) => !used.has(s.year));
  return pick?.year ?? FALLBACK_YEAR;
}

/**
 * The day's Marathon songs, in the order they're played: the whole (chosen-language)
 * catalog, seeded by the day, without the day's Daily Five songs (no spoilers).
 * Everyone with the same setting gets the same run of songs.
 */
export function marathonSongsFor(day: string, langs?: readonly Locale[]): Song[] {
  // The screen asks on every render, and the answer never changes: shuffle once.
  const key = `${day}|${(langs ?? LOCALES).join(",")}`;
  if (marathonCache?.key !== key) {
    const five = new Set(sortSongsFor(day, langs).map((s) => s.id));
    marathonCache = {
      key,
      songs: shuffled(`marathon:${day}`, langs).filter((s) => !five.has(s.id)),
    };
  }
  return marathonCache.songs;
}

let marathonCache: { key: string; songs: Song[] } | null = null;

/** The Marathon's starting year, different from the first song's year. */
export function marathonAnchorYearFor(day: string, langs?: readonly Locale[]): number {
  const first = marathonSongsFor(day, langs)[0];
  const pick = shuffled(`marathon-anchor:${day}`, langs).find((s) => s.year !== first?.year);
  return pick?.year ?? FALLBACK_YEAR;
}

/**
 * A free-play Marathon's songs: the catalog in the run's own random order. Only the `seed`
 * (made when a player presses "Play again") and the song languages pick them, never the day,
 * so a friend who opens a shared run gets exactly the same songs whenever they play it.
 */
export function marathonFreeSongsFor(seed: string, langs?: readonly Locale[]): Song[] {
  const key = `${seed}|${(langs ?? LOCALES).join(",")}`;
  if (freeCache?.key !== key) {
    freeCache = { key, songs: shuffled(`marathon-free:${seed}`, langs) };
  }
  return freeCache.songs;
}

let freeCache: { key: string; songs: Song[] } | null = null;

/** A free-play Marathon's starting year, different from its first song's year. */
export function marathonFreeAnchorYearFor(seed: string, langs?: readonly Locale[]): number {
  const first = marathonFreeSongsFor(seed, langs)[0];
  const pick = shuffled(`marathon-free-anchor:${seed}`, langs).find((s) => s.year !== first?.year);
  return pick?.year ?? FALLBACK_YEAR;
}

/** Starting year for a new Daily Timeline, different from the first song's year. */
export function timelineAnchorYearFor(
  day: string,
  songYear: number,
  langs?: readonly Locale[],
): number {
  const pick = shuffled(`timeline-anchor:${day}`, langs).find((s) => s.year !== songYear);
  return pick?.year ?? FALLBACK_YEAR;
}

/**
 * Pick the daily "Timeline" song. The day's sort songs are excluded (no spoilers),
 * as are songs already on the player's timeline and any songs they skipped
 * because the video couldn't play.
 */
export function timelineSongFor(
  day: string,
  exclude: ReadonlySet<string>,
  langs?: readonly Locale[],
): Song | undefined {
  const sortIds = new Set(sortSongsFor(day, langs).map((s) => s.id));
  const ok = (s: Song) => !sortIds.has(s.id) && !exclude.has(s.id);
  // If the chosen languages run out (a very long run), fall back to any song.
  return shuffled(`timeline:${day}`, langs).find(ok) ?? shuffled(`timeline:${day}`).find(ok);
}

import { type Locale, LOCALES } from "@/i18n/config";
import { marathonFreeAnchorYearFor } from "./daily";
import {
  isValidMarathonDay,
  marathonCurrent,
  marathonHits,
  placeInRun,
  placeMarathonSong,
  skipInRun,
  skipMarathonSong,
} from "./marathonState";
import type { MarathonDay, MarathonFreeRun, SaveData } from "./saveData";

/**
 * Free play: once the day's Marathon is over, the player can start another run as often as
 * they like. It isn't tomorrow's or yesterday's run but a detached one with its own random
 * songs, it never counts toward the stats, and it's shared as free play, not as the daily.
 * The share link carries only the run's seed, so a friend gets the same songs
 * (a challenge). A challenge can be played before the day's run.
 */

const SEED_LENGTH = 10;
const SEED = /^[a-z0-9]{10}$/;

/**
 * A seed as `newFreeSeed` makes it: ten lowercase letters and digits. Seeds come from links
 * and from storage, so anything else is refused.
 */
function isValidSeed(seed: unknown): seed is string {
  return typeof seed === "string" && SEED.test(seed);
}

function isValidFreeRun(r: Partial<MarathonFreeRun> | undefined): r is MarathonFreeRun {
  return (
    typeof r?.day === "string" &&
    isValidSeed(r.seed) &&
    (r.shared === undefined || typeof (r.shared as unknown) === "boolean") &&
    isValidMarathonDay(r)
  );
}

function dailyDone(data: SaveData, day: string): boolean {
  const daily = data.marathon.days[day];
  return isValidMarathonDay(daily) && !marathonCurrent(day, daily);
}

/** The free-play run to show today: one started today, after the daily run or from a link. */
function marathonFreeRun(data: SaveData, day: string): MarathonFreeRun | undefined {
  const free = data.marathon.free;
  if (!isValidFreeRun(free) || free.day !== day) {
    return undefined;
  }
  return dailyDone(data, day) || free.shared === true ? free : undefined;
}

/** What the Marathon screen plays, and the day's run beside it. */
export type MarathonRun = {
  state: MarathonDay | MarathonFreeRun;
  /** Free play: today's score in the daily run (so far), else null. */
  daily: number | null;
  /** Whether today's daily run is over. */
  dailyDone: boolean;
};

/** The run the Marathon screen plays: today's free-play run if there is one, else the daily. */
export function marathonRun(data: SaveData, day: string): MarathonRun | undefined {
  const today = data.marathon.days[day];
  const free = marathonFreeRun(data, day);
  const done = dailyDone(data, day);
  if (free && today) {
    return { state: free, daily: marathonHits(today), dailyDone: done };
  }
  return today ? { state: today, daily: null, dailyDone: done } : undefined;
}

function withRun(
  data: SaveData,
  day: string,
  { seed, languages, shared }: { seed: string; languages: Locale[]; shared?: boolean },
): SaveData {
  const free: MarathonFreeRun = {
    day,
    seed,
    anchorYear: marathonFreeAnchorYearFor(seed, languages),
    languages,
    placements: [],
    skipped: [],
    ...(shared ? { shared } : {}),
  };
  return { ...data, marathon: { ...data.marathon, free } };
}

/** Start a new free-play run (replacing any earlier one). Only once the daily run is over. */
export function startFreeMarathon(data: SaveData, day: string, seed: string): SaveData {
  if (!dailyDone(data, day)) {
    return data;
  }
  return withRun(data, day, { seed, languages: [...data.settings.songLanguages] });
}

/** A friend's run from a shared link: the same songs. */
export type MarathonChallenge = { seed: string; languages: Locale[] };

/** Start a friend's run, unless it's already the run on screen (a reload). */
export function startChallenge(
  data: SaveData,
  day: string,
  challenge: MarathonChallenge | undefined,
): SaveData {
  const free = data.marathon.free;
  if (!challenge || (free?.day === day && free.seed === challenge.seed)) {
    return data;
  }
  return withRun(data, day, { ...challenge, shared: true });
}

/** Leave free play for the day's run (after a challenge opened before it). */
export function leaveFreeMarathon(data: SaveData): SaveData {
  const { free: _, ...marathon } = data.marathon;
  return { ...data, marathon };
}

function withFree(data: SaveData, free: MarathonFreeRun | undefined): SaveData {
  return free ? { ...data, marathon: { ...data.marathon, free } } : data;
}

/** Place the current song of the run on screen (free play or the daily). */
export function placeMarathon(data: SaveData, day: string, slot: number): SaveData {
  const free = marathonFreeRun(data, day);
  return free ? withFree(data, placeInRun(day, free, slot)) : placeMarathonSong(data, day, slot);
}

/** Skip the current song of the run on screen (free play or the daily). */
export function skipMarathon(data: SaveData, day: string): SaveData {
  const free = marathonFreeRun(data, day);
  return free ? withFree(data, skipInRun(day, free)) : skipMarathonSong(data, day);
}

/** A random seed for a new free-play run. It has nothing to do with the day. */
export function newFreeSeed(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(SEED_LENGTH));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

/** The link that opens a free-play run for a friend: its seed and song languages. */
export function challengePath(run: MarathonFreeRun): string {
  const params = new URLSearchParams({ run: run.seed });
  if (run.languages.length < LOCALES.length) {
    params.set("songs", run.languages.join(","));
  }
  return `/marathon?${params.toString()}`;
}

/**
 * Reads a challenge link's query string; undefined when there's none or anything in it is off.
 * The address is anyone's to write, so every part is checked against what Spindle itself
 * makes: the seed's exact format and only known song languages. Nothing from it is shown on
 * the page; the seed only picks songs.
 */
export function parseChallenge(search: string): MarathonChallenge | undefined {
  const params = new URLSearchParams(search);
  const seed = params.get("run");
  const asked = params.get("songs")?.split(",") ?? [...LOCALES];
  const languages = LOCALES.filter((l) => asked.includes(l));
  if (!isValidSeed(seed) || languages.length !== asked.length) {
    return undefined;
  }
  return { seed, languages };
}

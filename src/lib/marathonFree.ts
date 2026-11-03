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
 */

function isValidFreeRun(r: Partial<MarathonFreeRun> | undefined): r is MarathonFreeRun {
  return typeof r?.day === "string" && typeof r.seed === "string" && isValidMarathonDay(r);
}

function dailyDone(data: SaveData, day: string): boolean {
  const daily = data.marathon.days[day];
  return isValidMarathonDay(daily) && !marathonCurrent(day, daily);
}

/** The free-play run to show today: only after the daily run, and only one started today. */
function marathonFreeRun(data: SaveData, day: string): MarathonFreeRun | undefined {
  const free = data.marathon.free;
  return dailyDone(data, day) && isValidFreeRun(free) && free.day === day ? free : undefined;
}

/**
 * The run the Marathon screen plays: today's free-play run if there is one, else the daily.
 * `daily` is the day's score during free play, else null.
 */
export function marathonRun(
  data: SaveData,
  day: string,
): { state: MarathonDay | MarathonFreeRun; daily: number | null } | undefined {
  const today = data.marathon.days[day];
  const free = marathonFreeRun(data, day);
  if (free && today) {
    return { state: free, daily: marathonHits(today) };
  }
  return today ? { state: today, daily: null } : undefined;
}

/** Start a new free-play run (replacing any earlier one). Only once the daily run is over. */
export function startFreeMarathon(data: SaveData, day: string, seed: string): SaveData {
  if (!dailyDone(data, day)) {
    return data;
  }
  const languages = [...data.settings.songLanguages];
  const free: MarathonFreeRun = {
    day,
    seed,
    anchorYear: marathonFreeAnchorYearFor(day, seed, languages),
    languages,
    placements: [],
    skipped: [],
  };
  return { ...data, marathon: { ...data.marathon, free } };
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

/** A seed for a new free-play run. */
export function newFreeSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

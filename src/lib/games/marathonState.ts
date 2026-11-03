import type { Messages } from "@/i18n/messages";
import { marathonAnchorYearFor, marathonFreeSongsFor, marathonSongsFor } from "@/lib/catalog/daily";
import { getSong, type Song } from "@/lib/catalog/songs";
import { correctSlot, isSlotCorrect } from "@/lib/line/timeline";
import type {
  MarathonDay,
  MarathonFreeRun,
  MarathonStats,
  SaveData,
  SortLineCard,
} from "@/lib/save/saveData";
import type { GameOpenEvent } from "@/lib/services/analytics";

/** Wrong guesses a Marathon can take. The day ends when they're all gone. */
export const MARATHON_HEARTS = 3;

function sameLanguages(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((l) => b.includes(l));
}

export function isValidMarathonDay(d: Partial<MarathonDay> | undefined): d is MarathonDay {
  return (
    d !== undefined &&
    typeof d.anchorYear === "number" &&
    Array.isArray(d.placements) &&
    Array.isArray(d.skipped) &&
    Array.isArray(d.languages)
  );
}

/**
 * Prepare today's Marathon. A day nobody has placed a song in yet is re-picked if the
 * player changed their song languages since it was first opened.
 */
export function ensureMarathonDay(data: SaveData, day: string): SaveData {
  const langs = data.settings.songLanguages;
  const existing = data.marathon.days[day];
  if (
    isValidMarathonDay(existing) &&
    (existing.placements.length > 0 || sameLanguages(existing.languages, langs))
  ) {
    return data;
  }
  const fresh: MarathonDay = {
    anchorYear: marathonAnchorYearFor(day, langs),
    languages: [...langs],
    placements: [],
    skipped: isValidMarathonDay(existing) ? existing.skipped : [],
  };
  return {
    ...data,
    marathon: { ...data.marathon, days: { ...data.marathon.days, [day]: fresh } },
  };
}

function marathonMisses(d: MarathonDay): number {
  return d.placements.filter((p) => !p.correct).length;
}

export function marathonHits(d: MarathonDay): number {
  return d.placements.filter((p) => p.correct).length;
}

/** The songs a run plays, in order: the day's for the daily run, its own for free play. */
function runSongs(day: string, d: MarathonDay | MarathonFreeRun): Song[] {
  return "seed" in d
    ? marathonFreeSongsFor(d.seed, d.languages)
    : marathonSongsFor(day, d.languages);
}

/** The song to place next, or undefined when the run is over. */
export function marathonCurrent(day: string, d: MarathonDay | MarathonFreeRun): Song | undefined {
  if (marathonMisses(d) >= MARATHON_HEARTS) {
    return undefined;
  }
  const used = new Set([...d.placements.map((p) => p.songId), ...d.skipped]);
  return runSongs(day, d).find((s) => !used.has(s.id));
}

/** The line as it stands. A song placed wrong is still added, at its real position. */
export function marathonLine(d: MarathonDay): SortLineCard[] {
  const line: SortLineCard[] = [{ kind: "anchor", year: d.anchorYear }];
  for (const p of d.placements) {
    const song = getSong(p.songId);
    if (song) {
      const at = p.correct ? p.slot : correctSlot(line, song.year);
      line.splice(at, 0, { kind: "song", song, year: song.year, correct: p.correct });
    }
  }
  return line;
}

function addMarathonResult(prev: MarathonStats, hits: number): MarathonStats {
  return {
    played: prev.played + 1,
    best: Math.max(prev.best, hits),
    totalHits: prev.totalHits + hits,
  };
}

/** A run with its current song placed into `slot`, or undefined when that can't be done. */
export function placeInRun<T extends MarathonDay>(
  day: string,
  run: T,
  slot: number,
): T | undefined {
  const song = marathonCurrent(day, run);
  const line = marathonLine(run);
  if (!song || slot < 0 || slot > line.length) {
    return undefined;
  }
  const correct = isSlotCorrect(line, slot, song.year);
  return { ...run, placements: [...run.placements, { songId: song.id, slot, correct }] };
}

/** A run with its current song skipped, or undefined when there's none. */
export function skipInRun<T extends MarathonDay>(day: string, run: T): T | undefined {
  const song = marathonCurrent(day, run);
  return song ? { ...run, skipped: [...run.skipped, song.id] } : undefined;
}

/** Place today's current song into `slot` (0 = before the first card). */
export function placeMarathonSong(data: SaveData, day: string, slot: number): SaveData {
  const current = data.marathon.days[day];
  const next = isValidMarathonDay(current) ? placeInRun(day, current, slot) : undefined;
  if (!next) {
    return data;
  }
  const done = !marathonCurrent(day, next);
  return {
    ...data,
    marathon: {
      ...data.marathon,
      days: { ...data.marathon.days, [day]: next },
      stats: done
        ? addMarathonResult(data.marathon.stats, marathonHits(next))
        : data.marathon.stats,
    },
  };
}

/** What placing a run's current song into `slot` would do: right or wrong, and whether the run ends. */
export function marathonOutcome(day: string, run: MarathonDay, slot: number) {
  const after = placeInRun(day, run, slot);
  const correct = after?.placements.at(-1)?.correct ?? false;
  return {
    correct,
    ends: !after || !marathonCurrent(day, after),
    score: marathonHits(run) + (correct ? 1 : 0),
  };
}

/** Skip today's current song because its video won't play. */
export function skipMarathonSong(data: SaveData, day: string): SaveData {
  const current = data.marathon.days[day];
  const next = isValidMarathonDay(current) ? skipInRun(day, current) : undefined;
  if (!next) {
    return data;
  }
  return { ...data, marathon: { ...data.marathon, days: { ...data.marathon.days, [day]: next } } };
}

/** Everything the Marathon screen shows about the day so far. */
export function marathonView(day: string, d: MarathonDay | MarathonFreeRun) {
  const current = marathonCurrent(day, d);
  const line = marathonLine(d);
  const lastPlacement = d.placements.at(-1);
  const last = getSong(lastPlacement?.songId);
  const misses = marathonMisses(d);
  return {
    done: !current,
    line,
    turn: d.placements.length,
    current,
    last,
    lastCorrect: lastPlacement?.correct ?? false,
    hits: marathonHits(d),
    hearts: Math.max(0, MARATHON_HEARTS - misses),
    // Where the song just placed really went.
    lastAt: last ? line.findIndex((c) => c.kind === "song" && c.song.id === last.id) : -1,
  };
}

/** How today's game looked when the screen opened. */
export function marathonOpenEvent(data: SaveData, day: string): GameOpenEvent {
  const d = data.marathon.days[day];
  if (d && !marathonCurrent(day, d)) {
    return { mode: "marathon", status: "done" };
  }
  return { mode: "marathon", status: d && d.placements.length > 0 ? "in_progress" : "new" };
}

/** The end-of-day headline and score line. */
export function marathonEndText(t: Messages, hearts: number, hits: number) {
  return {
    title: hearts === 0 ? t.marathon.over : t.marathon.ranOut,
    score: t.marathon.final(hits),
  };
}

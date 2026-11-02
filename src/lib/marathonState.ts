import type { Messages } from "@/i18n/messages";
import type { GameOpenEvent } from "./analytics";
import { marathonAnchorYearFor, marathonSongsFor } from "./daily";
import type { MarathonDay, MarathonStats, SaveData, SortLineCard } from "./saveData";
import { getSong, type Song } from "./songs";
import { correctSlot, isSlotCorrect } from "./timeline";

/** Wrong guesses a Marathon can take. The day ends when they're all gone. */
export const MARATHON_HEARTS = 3;

function sameLanguages(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((l) => b.includes(l));
}

function isValidMarathonDay(d: Partial<MarathonDay> | undefined): d is MarathonDay {
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

/** The song to place next, or undefined when the day is over. */
export function marathonCurrent(day: string, d: MarathonDay): Song | undefined {
  if (marathonMisses(d) >= MARATHON_HEARTS) {
    return undefined;
  }
  const used = new Set([...d.placements.map((p) => p.songId), ...d.skipped]);
  return marathonSongsFor(day, d.languages).find((s) => !used.has(s.id));
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

/** Place the current song into `slot` (0 = before the first card). */
export function placeMarathonSong(data: SaveData, day: string, slot: number): SaveData {
  const current = data.marathon.days[day];
  if (!isValidMarathonDay(current)) {
    return data;
  }
  const song = marathonCurrent(day, current);
  const line = marathonLine(current);
  if (!song || slot < 0 || slot > line.length) {
    return data;
  }
  const placements = [
    ...current.placements,
    { songId: song.id, slot, correct: isSlotCorrect(line, slot, song.year) },
  ];
  const next: MarathonDay = { ...current, placements };
  const done = !marathonCurrent(day, next);
  return {
    ...data,
    marathon: {
      days: { ...data.marathon.days, [day]: next },
      stats: done
        ? addMarathonResult(data.marathon.stats, marathonHits(next))
        : data.marathon.stats,
    },
  };
}

/** What placing the current song into `slot` would do: right or wrong, and whether the day ends. */
export function marathonOutcome(data: SaveData, day: string, slot: number) {
  const before = data.marathon.days[day];
  const after = placeMarathonSong(data, day, slot).marathon.days[day];
  const correct = after?.placements.at(-1)?.correct ?? false;
  return {
    correct,
    ends: !after || !marathonCurrent(day, after),
    score: (before ? marathonHits(before) : 0) + (correct ? 1 : 0),
  };
}

/** Skip the current song because its video won't play. */
export function skipMarathonSong(data: SaveData, day: string): SaveData {
  const current = data.marathon.days[day];
  const song = isValidMarathonDay(current) ? marathonCurrent(day, current) : undefined;
  if (!current || !song) {
    return data;
  }
  const next: MarathonDay = { ...current, skipped: [...current.skipped, song.id] };
  return { ...data, marathon: { ...data.marathon, days: { ...data.marathon.days, [day]: next } } };
}

/** Everything the Marathon screen shows about the day so far. */
export function marathonView(day: string, d: MarathonDay) {
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

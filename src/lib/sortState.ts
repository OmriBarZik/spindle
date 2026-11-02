import { type Locale, LOCALES } from "@/i18n/config";
import type { GameOpenEvent } from "./analytics";
import { anchorYearFor, sortSongsFor } from "./daily";
import { addDays } from "./dates";
import type { SaveData, SortDay, SortLineCard, SortPlacement, SortStats } from "./saveData";
import { getSong } from "./songs";
import { correctSlot, isSlotCorrect, type LineItem } from "./timeline";

function sameLanguages(a: readonly Locale[], b: readonly Locale[]): boolean {
  return a.length === b.length && a.every((l) => b.includes(l));
}

function isValidSortDay(d: Partial<SortDay> | undefined): d is SortDay {
  return d !== undefined && typeof d.anchorYear === "number" && Array.isArray(d.placements);
}

/**
 * Prepare today's Daily Five. A day that hasn't been started yet is re-picked if the
 * player changed their song languages since it was first opened.
 */
export function ensureSortDay(data: SaveData, day: string): SaveData {
  const langs = data.settings.songLanguages;
  const existing = data.sort.days[day];
  if (
    isValidSortDay(existing) &&
    (existing.placements.length > 0 || sameLanguages(existing.languages ?? LOCALES, langs))
  ) {
    return data;
  }
  return {
    ...data,
    sort: {
      ...data.sort,
      days: {
        ...data.sort.days,
        [day]: {
          anchorYear: anchorYearFor(day, langs),
          songIds: sortSongsFor(day, langs).map((s) => s.id),
          placements: [],
          languages: [...langs],
        },
      },
    },
  };
}

export function sortDayDone(d: SortDay): boolean {
  return d.placements.length >= d.songIds.length;
}

/**
 * The line as it stands: the anchor year plus every placed song. A song placed
 * in the wrong spot is still added — at its real position — so the line stays
 * accurate for the next song.
 */
export function sortLine(d: SortDay): SortLineCard[] {
  const line: SortLineCard[] = [{ kind: "anchor", year: d.anchorYear }];
  for (const [i, p] of d.placements.entries()) {
    const song = getSong(d.songIds[i]);
    if (song) {
      const at = p.correct ? p.slot : correctSlot(line, song.year);
      line.splice(at, 0, { kind: "song", song, year: song.year, correct: p.correct });
    }
  }
  return line;
}

/** Stats after finishing `day` with these placements. */
function addSortResult(prev: SortStats, day: string, placements: SortPlacement[]): SortStats {
  const hits = sortHits(placements);
  const stats = { ...prev, distribution: prev.distribution.slice() };
  stats.played += 1;
  stats.distribution[hits] = (stats.distribution[hits] ?? 0) + 1;
  if (hits === placements.length) {
    stats.perfect += 1;
    stats.streak = stats.lastPerfect === addDays(day, -1) ? stats.streak + 1 : 1;
    stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
    stats.lastPerfect = day;
  } else {
    stats.streak = 0;
  }
  return stats;
}

/** Place the current song into `slot` (0 = before the first card). */
export function placeSortSong(data: SaveData, day: string, slot: number): SaveData {
  const current = data.sort.days[day];
  if (!isValidSortDay(current) || sortDayDone(current)) {
    return data;
  }
  const song = getSong(current.songIds[current.placements.length]);
  if (!song) {
    return data;
  }
  const line = sortLine(current);
  if (slot < 0 || slot > line.length) {
    return data;
  }

  const placements = [
    ...current.placements,
    { slot, correct: isSlotCorrect(line, slot, song.year) },
  ];
  const next: SortDay = { ...current, placements };
  let sort = { ...data.sort, days: { ...data.sort.days, [day]: next } };

  if (sortDayDone(next)) {
    sort = { ...sort, stats: addSortResult(sort.stats, day, placements) };
  }
  return { ...data, sort };
}

export function sortHits(placements: readonly SortPlacement[]): number {
  return placements.filter((p) => p.correct).length;
}

/** Everything a Daily Five screen shows about the day so far. */
export function sortView(d: SortDay) {
  const done = sortDayDone(d);
  const line = sortLine(d);
  const turn = d.placements.length;
  const last = getSong(d.songIds[turn - 1]);
  return {
    done,
    line,
    turn,
    total: d.songIds.length,
    current: done ? undefined : getSong(d.songIds[turn]),
    last,
    lastCorrect: d.placements[turn - 1]?.correct ?? false,
    hits: sortHits(d.placements),
    // Where the song just placed really went.
    lastAt: last ? line.findIndex((c) => c.kind === "song" && c.song.id === last.id) : -1,
  };
}

/** The line as swipe-line cards. `movedHere` marks a song that was placed wrong. */
export function sortLineItems(line: readonly SortLineCard[], movedHere: string): LineItem[] {
  return line.map((card) =>
    card.kind === "anchor"
      ? { key: "anchor", year: card.year, song: null }
      : {
          key: card.song.id,
          year: card.year,
          song: card.song,
          variant: card.correct ? "good" : "bad",
          note: card.correct ? undefined : movedHere,
        },
  );
}

/** How today's game looked when the screen opened. */
export function sortOpenEvent(data: SaveData, day: string): GameOpenEvent {
  const d = data.sort.days[day];
  if (d && sortDayDone(d)) {
    return { mode: "daily_five", status: "done" };
  }
  return { mode: "daily_five", status: d && d.placements.length > 0 ? "in_progress" : "new" };
}

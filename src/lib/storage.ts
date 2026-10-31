import { addDays } from "./dates";
import { anchorYearFor, sortSongsFor, timelineAnchorYearFor, timelineSongFor } from "./daily";
import { getSong, SONG_LANGUAGES, songLanguage, type SongLanguage } from "./songs";
import {
  anchorCard,
  correctSlot,
  isSlotCorrect,
  songCount,
  type TimelineCard,
} from "./timeline";

const STORAGE_KEY = "spindle:v1";

export type SortPlacement = { slot: number; correct: boolean };

export type SortDay = {
  /** The year card the day's line starts with. */
  anchorYear: number;
  /** The five songs, in the order they're played. */
  songIds: string[];
  /** One entry per song placed so far (same order as songIds). */
  placements: SortPlacement[];
  /** Song languages the day was picked from. Missing (older saves) means all. */
  languages?: SongLanguage[];
};

/** One card on the Daily Five line. */
export type SortLineCard =
  | { kind: "anchor"; year: number }
  | { kind: "song"; id: string; year: number; correct: boolean };

export type SortStats = {
  played: number;
  perfect: number;
  /** Consecutive days with a perfect order. */
  streak: number;
  maxStreak: number;
  lastPerfect: string | null;
  /** distribution[n] = days with n songs placed correctly. */
  distribution: number[];
};

export type TimelineToday = {
  date: string;
  songId: string;
  /** Songs skipped today because the video was unavailable. */
  skipped: string[];
  /**
   * pending: not answered yet
   * correct / wrong: result of today's placement
   */
  result: "pending" | "correct" | "wrong";
  slot?: number;
};

export type TimelineState = {
  cards: TimelineCard[];
  runStart: string | null;
  /** Last day the player completed a turn in the current run. */
  lastDate: string | null;
  runOver: boolean;
  best: number;
  runs: number;
  today: TimelineToday | null;
};

export type Settings = {
  /** Which songs can appear in new puzzles. Never empty. */
  songLanguages: SongLanguage[];
};

export type SaveData = {
  version: 1;
  sort: { days: Record<string, SortDay>; stats: SortStats };
  timeline: TimelineState;
  settings: Settings;
};

export function emptySave(): SaveData {
  return {
    version: 1,
    sort: {
      days: {},
      stats: {
        played: 0,
        perfect: 0,
        streak: 0,
        maxStreak: 0,
        lastPerfect: null,
        distribution: [0, 0, 0, 0, 0, 0],
      },
    },
    timeline: {
      cards: [],
      runStart: null,
      lastDate: null,
      runOver: false,
      best: 0,
      runs: 0,
      today: null,
    },
    settings: { songLanguages: [...SONG_LANGUAGES] },
  };
}

/** Keeps only known languages, in canonical order; falls back to all when empty. */
function cleanLanguages(value: unknown): SongLanguage[] {
  const list = Array.isArray(value) ? value : [];
  const kept = SONG_LANGUAGES.filter((l) => list.includes(l));
  return kept.length > 0 ? kept : [...SONG_LANGUAGES];
}

function sameLanguages(a: readonly SongLanguage[], b: readonly SongLanguage[]): boolean {
  return a.length === b.length && a.every((l) => b.includes(l));
}

export function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySave();
    const parsed = JSON.parse(raw) as SaveData;
    if (parsed?.version !== 1) return emptySave();
    const base = emptySave();
    return {
      ...base,
      ...parsed,
      sort: {
        days: parsed.sort?.days ?? {},
        stats: { ...base.sort.stats, ...parsed.sort?.stats },
      },
      timeline: { ...base.timeline, ...parsed.timeline },
      settings: { songLanguages: cleanLanguages(parsed.settings?.songLanguages) },
    };
  } catch {
    return emptySave();
  }
}

export function writeSave(data: SaveData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Private mode / storage full: the game still works for this session.
  }
}

/* ------------------------------------------------------------------ */
/* Sort mode                                                           */
/* ------------------------------------------------------------------ */

function isValidSortDay(d: Partial<SortDay> | undefined): d is SortDay {
  return !!d && typeof d.anchorYear === "number" && Array.isArray(d.placements);
}

/** Turn a song language on or off. The last one left can't be turned off. */
export function setSongLanguage(data: SaveData, lang: SongLanguage, on: boolean): SaveData {
  const current = data.settings.songLanguages;
  if (current.includes(lang) === on) return data;
  const next = on ? cleanLanguages([...current, lang]) : current.filter((l) => l !== lang);
  if (next.length === 0) return data;
  return { ...data, settings: { ...data.settings, songLanguages: next } };
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
    (existing.placements.length > 0 ||
      sameLanguages(existing.languages ?? SONG_LANGUAGES, langs))
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
  d.placements.forEach((p, i) => {
    const song = getSong(d.songIds[i]);
    if (!song) return;
    const at = p.correct ? p.slot : correctSlot(line, song.year);
    line.splice(at, 0, { kind: "song", id: song.id, year: song.year, correct: p.correct });
  });
  return line;
}

/** Place the current song into `slot` (0 = before the first card). */
export function placeSortSong(data: SaveData, day: string, slot: number): SaveData {
  const current = data.sort.days[day];
  if (!isValidSortDay(current) || sortDayDone(current)) return data;
  const song = getSong(current.songIds[current.placements.length]);
  if (!song) return data;
  const line = sortLine(current);
  if (slot < 0 || slot > line.length) return data;

  const placements = [...current.placements, { slot, correct: isSlotCorrect(line, slot, song.year) }];
  const next: SortDay = { ...current, placements };
  let sort = { ...data.sort, days: { ...data.sort.days, [day]: next } };

  if (sortDayDone(next)) {
    const hits = placements.filter((p) => p.correct).length;
    const perfect = hits === placements.length;
    const stats = { ...sort.stats, distribution: sort.stats.distribution.slice() };
    stats.played += 1;
    stats.distribution[hits] = (stats.distribution[hits] ?? 0) + 1;
    if (perfect) {
      stats.perfect += 1;
      stats.streak = stats.lastPerfect === addDays(day, -1) ? stats.streak + 1 : 1;
      stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
      stats.lastPerfect = day;
    } else {
      stats.streak = 0;
    }
    sort = { ...sort, stats };
  }
  return { ...data, sort };
}

/* ------------------------------------------------------------------ */
/* Timeline mode                                                       */
/* ------------------------------------------------------------------ */

/** Whether the run shown in `t` is still alive going into `day`. */
export function runContinues(t: TimelineState, day: string): boolean {
  return t.cards.length > 0 && !t.runOver && t.lastDate === addDays(day, -1);
}

/**
 * Prepare today's turn: keep the timeline if the player played yesterday and
 * didn't miss, otherwise start a fresh one from a free starting year. Then
 * lock in today's song.
 */
export function ensureTimelineDay(data: SaveData, day: string): SaveData {
  const t = data.timeline;
  const langs = data.settings.songLanguages;
  if (t.today?.date === day) {
    if (t.today.result !== "pending") return data;
    let today = t.today;
    let cards = t.cards;
    // The player turned off this song's language before answering: swap it.
    const current = getSong(today.songId);
    if (current && !langs.includes(songLanguage(current))) {
      const exclude = new Set([...cards.map((c) => c.id), ...today.skipped, today.songId]);
      const swap = timelineSongFor(day, exclude, langs);
      if (swap && langs.includes(songLanguage(swap))) today = { ...today, songId: swap.id };
    }
    // Saves from before starting years existed: give today's turn one.
    if (cards.length === 0) {
      const song = getSong(today.songId);
      if (song) cards = [anchorCard(timelineAnchorYearFor(day, song.year, langs))];
    }
    if (today === t.today && cards === t.cards) return data;
    return { ...data, timeline: { ...t, cards, today } };
  }

  const continuing = runContinues(t, day);
  const exclude = new Set(continuing ? t.cards.map((c) => c.id) : []);
  const song = timelineSongFor(day, exclude, langs);
  if (!song) return data;

  let next: TimelineState = { ...t };
  if (!continuing) {
    next = {
      ...next,
      cards: [anchorCard(timelineAnchorYearFor(day, song.year, langs))],
      runStart: day,
      runOver: false,
      lastDate: null,
      runs: t.runStart ? t.runs + 1 : t.runs,
    };
  }
  next.today = { date: day, songId: song.id, skipped: [], result: "pending" };
  return { ...data, timeline: next };
}

/** Swap today's song for another one when the video won't play. */
export function skipTimelineSong(data: SaveData, day: string): SaveData {
  const today = data.timeline.today;
  if (!today || today.date !== day || today.result !== "pending") return data;
  const skipped = [...today.skipped, today.songId];
  const exclude = new Set([...data.timeline.cards.map((c) => c.id), ...skipped]);
  const song = timelineSongFor(day, exclude, data.settings.songLanguages);
  if (!song) return data;
  return {
    ...data,
    timeline: { ...data.timeline, today: { ...today, songId: song.id, skipped } },
  };
}

function toCard(id: string): TimelineCard | null {
  const s = getSong(id);
  return s
    ? { id: s.id, title: s.title, artist: s.artist, year: s.year, youtubeId: s.youtubeId }
    : null;
}

export function placeTimelineCard(data: SaveData, day: string, slot: number): SaveData {
  const t = data.timeline;
  if (!t.today || t.today.date !== day || t.today.result !== "pending") return data;
  if (slot < 0 || slot > t.cards.length) return data;
  const card = toCard(t.today.songId);
  if (!card) return data;

  if (isSlotCorrect(t.cards, slot, card.year)) {
    const cards = t.cards.slice();
    cards.splice(slot, 0, card);
    return {
      ...data,
      timeline: {
        ...t,
        cards,
        lastDate: day,
        best: Math.max(t.best, songCount(cards)),
        today: { ...t.today, result: "correct", slot },
      },
    };
  }
  return {
    ...data,
    timeline: {
      ...t,
      lastDate: day,
      runOver: true,
      today: { ...t.today, result: "wrong", slot },
    },
  };
}

export { correctSlot };

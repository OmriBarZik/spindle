import { addDays } from "./dates";
import { initialSortOrder, sortSongsFor, timelineSongFor } from "./daily";
import { getSong } from "./songs";
import { correctSlot, isSlotCorrect, type TimelineCard } from "./timeline";

const STORAGE_KEY = "spindle:v1";

export type SortDay = {
  order: string[];
  submitted: boolean;
  /** Per position: was the right song in that spot? */
  correct?: boolean[];
};

export type SortStats = {
  played: number;
  perfect: number;
  /** Consecutive days with a perfect order. */
  streak: number;
  maxStreak: number;
  lastPerfect: string | null;
  /** distribution[n] = days with n songs in the right spot. */
  distribution: number[];
};

export type TimelineToday = {
  date: string;
  songId: string;
  /** Songs skipped today because the video was unavailable. */
  skipped: string[];
  /**
   * pending: not answered yet
   * anchor:  first card of a new timeline (just revealed)
   * correct / wrong: result of today's placement
   */
  result: "pending" | "anchor" | "correct" | "wrong";
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

export type SaveData = {
  version: 1;
  sort: { days: Record<string, SortDay>; stats: SortStats };
  timeline: TimelineState;
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
  };
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

export function ensureSortDay(data: SaveData, day: string): SaveData {
  if (data.sort.days[day]) return data;
  return {
    ...data,
    sort: {
      ...data.sort,
      days: {
        ...data.sort.days,
        [day]: { order: initialSortOrder(day), submitted: false },
      },
    },
  };
}

export function moveSortItem(data: SaveData, day: string, from: number, to: number): SaveData {
  const current = data.sort.days[day];
  if (!current || current.submitted) return data;
  if (to < 0 || to >= current.order.length || from === to) return data;
  const order = current.order.slice();
  const [item] = order.splice(from, 1);
  order.splice(to, 0, item);
  return {
    ...data,
    sort: { ...data.sort, days: { ...data.sort.days, [day]: { ...current, order } } },
  };
}

export function submitSort(data: SaveData, day: string): SaveData {
  const current = data.sort.days[day];
  if (!current || current.submitted) return data;
  const sortedYears = sortSongsFor(day)
    .map((s) => s.year)
    .sort((a, b) => a - b);
  const correct = current.order.map((id, i) => getSong(id)?.year === sortedYears[i]);
  const hits = correct.filter(Boolean).length;
  const perfect = hits === correct.length;

  const stats = { ...data.sort.stats, distribution: data.sort.stats.distribution.slice() };
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

  return {
    ...data,
    sort: {
      stats,
      days: { ...data.sort.days, [day]: { ...current, submitted: true, correct } },
    },
  };
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
 * didn't miss, otherwise start a fresh one. Then lock in today's song.
 */
export function ensureTimelineDay(data: SaveData, day: string): SaveData {
  const t = data.timeline;
  if (t.today?.date === day) return data;

  let next: TimelineState = { ...t };
  if (!runContinues(t, day)) {
    next = {
      ...next,
      cards: [],
      runStart: day,
      runOver: false,
      lastDate: null,
      runs: t.cards.length > 0 ? t.runs + 1 : t.runs,
    };
  }
  const song = timelineSongFor(day, new Set(next.cards.map((c) => c.id)));
  if (!song) return data;
  next.today = { date: day, songId: song.id, skipped: [], result: "pending" };
  return { ...data, timeline: next };
}

/** Swap today's song for another one when the video won't play. */
export function skipTimelineSong(data: SaveData, day: string): SaveData {
  const today = data.timeline.today;
  if (!today || today.date !== day || today.result !== "pending") return data;
  const skipped = [...today.skipped, today.songId];
  const exclude = new Set([...data.timeline.cards.map((c) => c.id), ...skipped]);
  const song = timelineSongFor(day, exclude);
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

/** First day of a run: reveal the song and make it the first card. */
export function revealAnchor(data: SaveData, day: string): SaveData {
  const t = data.timeline;
  if (!t.today || t.today.date !== day || t.today.result !== "pending" || t.cards.length) {
    return data;
  }
  const card = toCard(t.today.songId);
  if (!card) return data;
  return {
    ...data,
    timeline: {
      ...t,
      cards: [card],
      lastDate: day,
      best: Math.max(t.best, 1),
      today: { ...t.today, result: "anchor" },
    },
  };
}

export function placeTimelineCard(data: SaveData, day: string, slot: number): SaveData {
  const t = data.timeline;
  if (!t.today || t.today.date !== day || t.today.result !== "pending" || !t.cards.length) {
    return data;
  }
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
        best: Math.max(t.best, cards.length),
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

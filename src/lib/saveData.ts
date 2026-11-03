import type { Locale } from "@/i18n/config";
import type { Song } from "./songs";
import type { TimelineCard } from "./timeline";

export type SortPlacement = { slot: number; correct: boolean };

export type SortDay = {
  /** The year card the day's line starts with. */
  anchorYear: number;
  /** The five songs, in the order they're played. */
  songIds: string[];
  /** One entry per song placed so far (same order as songIds). */
  placements: SortPlacement[];
  /** Song languages the day was picked from. Missing (older saves) means all. */
  languages?: Locale[];
};

/** One card on the Daily Five line. */
export type SortLineCard =
  | { kind: "anchor"; year: number }
  | { kind: "song"; song: Song; year: number; correct: boolean };

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

type MarathonPlacement = { songId: string; slot: number; correct: boolean };

export type MarathonDay = {
  /** The year card the day's line starts with. */
  anchorYear: number;
  /** Song languages the day was picked from. */
  languages: Locale[];
  /** Every song placed so far, in order. */
  placements: MarathonPlacement[];
  /** Songs skipped because the video couldn't play. */
  skipped: string[];
};

/**
 * A free-play Marathon, started with "Play again" once the day's run is over. It has its
 * own random shuffle (`seed`) and never touches the daily run or the stats.
 */
export type MarathonFreeRun = MarathonDay & {
  /** The day it was started: it only shows on that day. */
  day: string;
  /** Picks the run's songs (`marathonFreeSongsFor`); shared links carry it. */
  seed: string;
  /** Opened from a friend's link: the score to beat. */
  beat?: number;
};

export type MarathonStats = {
  played: number;
  /** Most songs placed right in one day. */
  best: number;
  /** Songs placed right over every finished day, for the average. */
  totalHits: number;
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

type SaveSettings = {
  /** Which songs can appear in new puzzles. Never empty. */
  songLanguages: Locale[];
};

export type SaveData = {
  version: 1;
  sort: { days: Record<string, SortDay>; stats: SortStats };
  timeline: TimelineState;
  marathon: { days: Record<string, MarathonDay>; stats: MarathonStats; free?: MarathonFreeRun };
  settings: SaveSettings;
};

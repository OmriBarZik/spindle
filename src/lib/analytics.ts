import type { Locale } from "@/i18n/config";

/**
 * Custom Google Analytics events that follow a player through the game. GA itself is
 * loaded in the root layout; page views come from GA's enhanced measurement.
 *
 * Never send song details (title, artist, year, video ID): the events are about how
 * people play, and they must never be able to reveal an answer.
 */

export type GameMode = "daily_five" | "marathon" | "timeline";

type Events = {
  /** A game screen opened. `status` is the state of today's game at that moment. */
  game_open: { mode: GameMode; status: "new" | "in_progress" | "done" };
  /** The player pressed play (not pause). `turn` is 1-based. */
  song_play: { mode: GameMode; turn: number };
  /** A song was placed on the line. `turn` is 1-based. */
  song_place: { mode: GameMode; turn: number; correct: boolean };
  /**
   * The day's game is over: Daily Five has placed all five songs; a Marathon has lost its
   * last heart (`free_play` when it was an extra run after the daily one). `score` is how many
   * songs were placed right.
   */
  game_complete:
    | { mode: "daily_five"; score: number; total: number; perfect: boolean }
    | { mode: "marathon"; score: number; free_play: boolean };
  /** Daily Timeline (hidden page): a wrong guess ended the run. `songs` is how many it had placed. */
  run_end: { mode: "timeline"; songs: number };
  /** After the day's Marathon, the player started a free-play run ("Play again"). */
  play_again: { mode: "marathon" };
  /** The current video wouldn't play, so the player asked for another. */
  song_skip: { mode: "marathon" | "timeline" };
  /** The share button. `method` is what happened (GA's recommended `share` event). */
  share: { content_type: GameMode; method: "shared" | "copied" | "failed" };
  language_switch: { from: Locale; to: Locale };
  song_languages_change: { song_language: Locale; enabled: boolean };
};

/** How a game screen reports opening. */
export type GameOpenEvent = Events["game_open"];

declare global {
  // Adding a field to the global Window needs declaration merging, which only interfaces do.
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface Window {
    /** Defined by the GA snippet. Missing until it runs, in tests, and with blockers. */
    gtag?: (command: "event", name: string, params: Record<string, unknown>) => void;
  }
}

/** Sends a GA event. Does nothing when GA isn't loaded (tests, ad blockers). */
export function track<K extends keyof Events>(name: K, params: Events[K]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.gtag?.("event", name, params);
}

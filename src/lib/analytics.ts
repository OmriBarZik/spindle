import type { Locale } from "@/i18n/config";
import type { SongLanguage } from "@/lib/songs";

/**
 * Custom Google Analytics events that follow a player through the game. GA itself is
 * loaded in the root layout; page views come from GA's enhanced measurement.
 *
 * Never send song details (title, artist, year, video ID): the events are about how
 * people play, and they must never be able to reveal an answer.
 */

export type GameMode = "daily_five" | "timeline";

type Events = {
  /** A game screen opened. `status` is the state of today's game at that moment. */
  game_open: { mode: GameMode; status: "new" | "in_progress" | "done" };
  /** The player pressed play (not pause). `turn` is 1-based. */
  song_play: { mode: GameMode; turn: number };
  /** A song was placed on the line. `turn` is 1-based. */
  song_place: { mode: GameMode; turn: number; correct: boolean };
  /** Daily Five: all five songs are placed. */
  game_complete: { mode: "daily_five"; score: number; total: number; perfect: boolean };
  /** Daily Timeline: a wrong guess ended the run. `songs` is how many it had placed. */
  run_end: { mode: "timeline"; songs: number };
  /** Daily Timeline: today's video wouldn't play, so the player asked for another. */
  song_skip: { mode: "timeline" };
  /** The share button. `method` is what happened (GA's recommended `share` event). */
  share: { content_type: GameMode; method: "shared" | "copied" | "failed" };
  language_switch: { from: Locale; to: Locale };
  song_languages_change: { song_language: SongLanguage; enabled: boolean };
};

export type EventName = keyof Events;

declare global {
  // Adding a field to the global Window needs declaration merging, which only interfaces do.
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface Window {
    /** Defined by the GA snippet. Missing until it runs, in tests, and with blockers. */
    gtag?: (command: "event", name: string, params: Record<string, unknown>) => void;
  }
}

/** Sends a GA event. Does nothing when GA isn't loaded (tests, ad blockers). */
export function track<K extends EventName>(name: K, params: Events[K]): void {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, params);
}

"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  attachPlayer,
  IDLE_PLAYER,
  pauseVideo,
  type PlayerState,
  playerState,
  playVideo,
  restartVideo,
  stopVideo,
  subscribePlayer,
  toggleVideo,
} from "@/lib/services/player";

/** The shared player's state, plus the commands a screen sends it. */
export type Player = PlayerState & {
  play: (videoId: string, start?: number) => void;
  pause: () => void;
  toggle: (videoId: string, start?: number) => void;
  restart: (start?: number) => void;
  stop: () => void;
};

const COMMANDS = {
  play: playVideo,
  pause: pauseVideo,
  toggle: toggleVideo,
  restart: restartVideo,
  stop: stopVideo,
};

/**
 * The one YouTube player (`lib/services/player.ts`), for a game screen. The screen holds it
 * while mounted; the player itself lives outside React, so a remount (a language
 * switch) keeps the song going.
 */
export function usePlayer(): Player {
  useEffect(() => attachPlayer(), []);
  const state = useSyncExternalStore(subscribePlayer, playerState, () => IDLE_PLAYER);
  return useMemo(() => ({ ...state, ...COMMANDS }), [state]);
}

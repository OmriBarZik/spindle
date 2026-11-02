"use client";

import dynamic from "next/dynamic";
import { GameLoading } from "@/components/GameLoading";

const loadSort = () => import("@/components/SortGame").then((m) => m.SortGame);
const loadTimeline = () => import("@/components/TimelineGame").then((m) => m.TimelineGame);

/**
 * Fetch the game screens' code ahead of time (from the home page), so that
 * opening a game doesn't wait on the network. Safe to call many times.
 */
export function preloadGames() {
  void loadSort().catch(ignore);
  void loadTimeline().catch(ignore);
}

function ignore(): void {
  // A failed preload is retried when the game is opened.
}

export const SortGameClient = dynamic(loadSort, {
  ssr: false,
  loading: GameLoading,
});

export const TimelineGameClient = dynamic(loadTimeline, {
  ssr: false,
  loading: GameLoading,
});

export const SettingsClient = dynamic(
  () => import("@/components/Settings").then((m) => m.Settings),
  {
    ssr: false,
    loading: GameLoading,
  },
);

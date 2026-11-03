"use client";

import dynamic from "next/dynamic";
import { GameLoading } from "@/components/game/GameLoading";
import { WeekStripLoading } from "@/components/home/WeekStripLoading";

const loadSort = () => import("@/components/sort/SortGame").then((m) => m.SortGame);
const loadTimeline = () => import("@/components/timeline/TimelineGame").then((m) => m.TimelineGame);
const loadMarathon = () => import("@/components/marathon/MarathonGame").then((m) => m.MarathonGame);

/**
 * Fetch the game screens' code ahead of time (from the home page), so that
 * opening a game doesn't wait on the network. Safe to call many times.
 */
export function preloadGames() {
  void loadSort().catch(ignore);
  void loadMarathon().catch(ignore);
}

function ignore(): void {
  // A failed preload is retried when the game is opened.
}

export const SortGameClient = dynamic(loadSort, {
  ssr: false,
  loading: GameLoading,
});

/** Daily Timeline, kept as a hidden page (not linked or preloaded from the home page). */
export const TimelineGameClient = dynamic(loadTimeline, {
  ssr: false,
  loading: GameLoading,
});

export const MarathonGameClient = dynamic(loadMarathon, {
  ssr: false,
  loading: GameLoading,
});

export const SettingsClient = dynamic(
  () => import("@/components/settings/Settings").then((m) => m.Settings),
  {
    ssr: false,
    loading: GameLoading,
  },
);

export const WeekStripClient = dynamic(
  () => import("@/components/home/WeekStrip").then((m) => m.WeekStrip),
  {
    ssr: false,
    loading: WeekStripLoading,
  },
);

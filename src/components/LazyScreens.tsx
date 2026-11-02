"use client";

import dynamic from "next/dynamic";
import { GameLoading } from "@/components/GameLoading";
import { WeekStripLoading } from "@/components/WeekStripLoading";

const loadSort = () => import("@/components/SortGame").then((m) => m.SortGame);
const loadMarathon = () => import("@/components/MarathonGame").then((m) => m.MarathonGame);

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

export const MarathonGameClient = dynamic(loadMarathon, {
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

export const WeekStripClient = dynamic(
  () => import("@/components/WeekStrip").then((m) => m.WeekStrip),
  {
    ssr: false,
    loading: WeekStripLoading,
  },
);

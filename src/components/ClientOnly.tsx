"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { isRecordFlying } from "@/lib/recordFlight";

function Loading() {
  const { t } = useI18n();
  // While the home record is flying in, it stands in for the loading text.
  const [flying] = useState(isRecordFlying);
  return (
    <p className={`p-8 text-center text-muted ${flying ? "invisible" : ""}`}>
      {t.common.loadingGame}
    </p>
  );
}

const loadSort = () => import("@/components/SortGame");
const loadTimeline = () => import("@/components/TimelineGame");

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
  loading: Loading,
});

export const TimelineGameClient = dynamic(loadTimeline, {
  ssr: false,
  loading: Loading,
});

export const SettingsClient = dynamic(() => import("@/components/Settings"), {
  ssr: false,
  loading: Loading,
});

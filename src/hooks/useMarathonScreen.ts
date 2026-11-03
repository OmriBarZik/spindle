"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { parseChallenge, startChallenge } from "@/lib/marathonFree";
import { ensureMarathonDay, marathonOpenEvent } from "@/lib/marathonState";
import type { SaveData } from "@/lib/saveData";
import { useGameScreen } from "./useGameScreen";

/** Today's run, and a friend's run when the page was opened from their challenge link. */
function prepare(data: SaveData, day: string): SaveData {
  return startChallenge(ensureMarathonDay(data, day), day, parseChallenge(window.location.search));
}

/** The Marathon screen's start: `useGameScreen`, plus opening a friend's challenge link. */
export function useMarathonScreen() {
  const screen = useGameScreen(prepare, marathonOpenEvent);
  // The challenge has started (or was already going): drop it from the address, so a reload
  // after "Play again" doesn't bring it back.
  useEffect(() => {
    if (parseChallenge(window.location.search)) {
      track("challenge_open", { mode: "marathon" });
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  }, []);
  return screen;
}

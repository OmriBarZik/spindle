"use client";

import { useEffect } from "react";
import { parseChallenge, startChallenge } from "@/lib/games/marathonFree";
import { ensureMarathonDay, marathonOpenEvent } from "@/lib/games/marathonState";
import type { SaveData } from "@/lib/save/saveData";
import { track } from "@/lib/services/analytics";
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

"use client";

import { useEffect, useState } from "react";
import { dayKey } from "@/lib/catalog/dates";
import { createLiveSlot } from "@/lib/line/liveSlot";
import type { SaveData } from "@/lib/save/saveData";
import { type GameOpenEvent, track } from "@/lib/services/analytics";
import { usePlayer } from "./usePlayer";
import { useSave } from "./useSave";

/**
 * A result animation on the record. "next" glows, swipes out in the reading
 * direction and brings the next record in; "last" glows and swipes out for
 * good; "flash" only glows.
 */
export type DeckSwap = { correct: boolean; kind: "next" | "last" | "flash" };

/**
 * What both game screens start from: today's save, the shared player, and the state of
 * the record and the line. `prepare` sets up today in the save; `opened` says how the
 * game looked when the screen opened, which is reported once.
 */
export function useGameScreen(
  prepare: (data: SaveData, day: string) => SaveData,
  opened: (data: SaveData, day: string) => GameOpenEvent,
) {
  const [day] = useState(dayKey);
  const [data, update] = useSave((d) => prepare(d, day));
  const player = usePlayer();
  const [slot, setSlot] = useState<number | null>(null);
  // The gap under the record mid-swipe, shared by the line and the place button.
  const [live] = useState(createLiveSlot);
  // The record's result animation; nothing can be played or placed until it ends.
  const [swap, setSwap] = useState<DeckSwap | null>(null);

  const [openEvent] = useState(() => opened(data, day));
  useEffect(() => track("game_open", openEvent), [openEvent]);

  return { day, data, update, player, slot, setSlot, live, swap, setSwap };
}

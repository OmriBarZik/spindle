"use client";

import { useSyncExternalStore } from "react";
import { useKeyShortcut } from "@/hooks/useKeyShortcut";
import { useI18n } from "@/i18n/I18nProvider";
import type { LiveSlot } from "@/lib/liveSlot";
import { slotLabel } from "@/lib/timeline";

/**
 * Answers with the gap under the record. It says where the song goes ("Between
 * 1992 and 1997"); its accessible name adds the action ("Place it: …").
 */
export function PlaceButton({
  cards,
  slot,
  live,
  disabled = false,
  onPlace,
}: {
  cards: readonly { year: number }[];
  slot: number;
  /** Follows the strip mid-swipe, ahead of the game's own state. */
  live: LiveSlot;
  disabled?: boolean;
  onPlace: (slot: number) => void;
}) {
  const { t } = useI18n();
  const at = useSyncExternalStore(live.subscribe, live.get, live.get) ?? slot;
  const where = slotLabel(cards, at, t.placeAt);
  // Enter places the song from anywhere on the page (a focused button keeps its own Enter).
  useKeyShortcut("Enter", !disabled, () => onPlace(at));
  return (
    <button
      type="button"
      className="btn-primary mx-auto max-w-page"
      disabled={disabled}
      aria-label={t.common.placeIt(where)}
      aria-keyshortcuts="Enter"
      onClick={() => onPlace(at)}
    >
      {where}
    </button>
  );
}

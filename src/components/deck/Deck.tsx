"use client";

import { clsx } from "clsx";
import type { ReactNode } from "react";
import { DeckRecord } from "@/components/deck/DeckRecord";
import { DeckStatus } from "@/components/deck/DeckStatus";
import { DeckTransport } from "@/components/deck/DeckTransport";
import type { DeckSwap } from "@/hooks/game/useGameScreen";
import { useKeyShortcut } from "@/hooks/game/useKeyShortcut";
import type { Player } from "@/hooks/game/usePlayer";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  player: Player;
  /** The song this deck plays when the big button is pressed. */
  videoId: string | null;
  start?: number;
  label?: string;
  onSkip?: () => void;
  /** Called when the big button starts the song (not when it pauses). */
  onPlay?: () => void;
  /** While set, the record animates and the play button is locked. */
  swap?: DeckSwap | null;
  onSwapEnd?: () => void;
  /**
   * Puts the record inside something else (the swipe line), with a smaller record.
   * The time, Restart and status still sit below.
   */
  around?: (record: ReactNode) => ReactNode;
};

/** The turntable: the record, its transport row and the status line. */
export function Deck({
  player,
  videoId,
  start = 0,
  label,
  onSkip,
  onPlay,
  swap,
  onSwapEnd,
  around,
}: Props) {
  const { t } = useI18n();
  const isCurrent = videoId !== null && player.currentId === videoId;
  const playing = isCurrent && player.status === "playing";
  const loading = isCurrent && player.status === "loading";
  const small = Boolean(around);

  function statusText() {
    if (!player.ready) {
      return t.common.loadingPlayer;
    }
    return loading ? t.common.loadingSong : "";
  }

  const disabled = !player.ready || !videoId || Boolean(swap);
  function toggle() {
    if (!videoId) {
      return;
    }
    if (!playing && !loading) {
      onPlay?.();
    }
    player.toggle(videoId, start);
  }
  // Space plays and pauses from anywhere on the page, like a media player.
  useKeyShortcut(" ", !disabled, toggle);

  const record = (
    <DeckRecord
      active={playing || loading}
      busy={loading || !player.ready}
      spinning={playing}
      small={small}
      disabled={disabled}
      swap={swap}
      onSwapEnd={onSwapEnd}
      onToggle={toggle}
    />
  );

  return (
    // While the record swipes, clip sideways so the page doesn't scroll horizontally.
    // Only then, so the flight from the home page is never clipped.
    <div
      className={clsx(
        "flex flex-col items-center",
        small ? "gap-100" : "gap-200",
        swap && "overflow-x-clip",
      )}
    >
      {around ? around(record) : record}
      <DeckTransport
        label={label}
        time={isCurrent ? player.time : null}
        small={small}
        onRestart={() => player.restart(start)}
      />
      <DeckStatus
        text={statusText()}
        errored={isCurrent && player.status === "error"}
        onSkip={onSkip}
      />
    </div>
  );
}

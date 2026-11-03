"use client";

import { clsx } from "clsx";
import { type ReactNode, type RefObject, useEffect } from "react";
import { DeckRecord } from "@/components/DeckRecord";
import { DeckStatus } from "@/components/DeckStatus";
import { DeckTransport } from "@/components/DeckTransport";
import type { DeckSwap } from "@/hooks/useGameScreen";
import type { HiddenPlayer } from "@/hooks/useHiddenPlayer";
import { useKeyShortcut } from "@/hooks/useKeyShortcut";
import { useI18n } from "@/i18n/I18nProvider";
import { takeHandoff } from "@/lib/playHandoff";

type Props = {
  hostRef: RefObject<HTMLDivElement | null>;
  player: HiddenPlayer;
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
  hostRef,
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
  // Carry on with a song that was playing when the player switched language.
  const { ready, play } = player;
  useEffect(() => {
    if (!ready || !videoId) {
      return;
    }
    const handoff = takeHandoff(videoId);
    if (handoff?.playing) {
      play(videoId, handoff.time);
    }
  }, [ready, videoId, play]);

  // Space plays and pauses from anywhere on the page, like a media player.
  useKeyShortcut(" ", !disabled, toggle);

  const record = (
    <DeckRecord
      hostRef={hostRef}
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

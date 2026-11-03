"use client";

import { clsx } from "clsx";
import { useLayoutEffect, useRef } from "react";
import { DeckPlayIcon } from "@/components/DeckPlayIcon";
import { useRecordLanding } from "@/hooks/recordFlight";
import type { DeckSwap } from "@/hooks/useGameScreen";
import { useI18n } from "@/i18n/I18nProvider";
import { smoothScrollToCenter } from "@/lib/smoothScroll";

/**
 * The record with its play button. It only sends commands: the YouTube player itself
 * is shared and hidden (`lib/player.ts`).
 */
export function DeckRecord({
  active,
  busy,
  spinning,
  small,
  disabled,
  swap,
  onSwapEnd,
  onToggle,
}: {
  /** The song is playing or on its way, so the button pauses. */
  active: boolean;
  busy: boolean;
  spinning: boolean;
  small: boolean;
  disabled: boolean;
  swap?: DeckSwap | null;
  onSwapEnd?: () => void;
  onToggle: () => void;
}) {
  const { t } = useI18n();

  // Coming from the home page, the record flies in from where it was there.
  const boxRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useRecordLanding(boxRef, buttonRef);

  // After a guess the player is usually down at the "Place it" button, below a
  // long timeline. Bring the record into view so they see it glow and swipe.
  // A layout effect, so the glide starts in the same frame as the guess.
  const swapping = Boolean(swap);
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!swapping || !box) {
      return;
    }
    const r = box.getBoundingClientRect();
    if (r.top >= 0 && r.bottom <= window.innerHeight) {
      return;
    }
    return smoothScrollToCenter(box);
  }, [swapping]);

  return (
    <div
      ref={boxRef}
      className={clsx(
        "relative aspect-square",
        small ? "w-(--size-record-small)" : "w-(--size-record) sm:w-(--size-record-large)",
      )}
    >
      {/* Loading ring: always mounted and faded in/out so nothing shifts. */}
      <div
        aria-hidden
        className={clsx(
          "loading-ring pointer-events-none absolute -inset-150 rounded-full transition-opacity duration-300",
          busy ? "opacity-100" : "loading-ring-idle opacity-0",
        )}
      />
      <div
        className={clsx("absolute inset-0", swap && `deck-swap deck-swap-${swap.kind}`)}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) {
            onSwapEnd?.();
          }
        }}
      >
        <div className={clsx("record absolute inset-0 rounded-full", spinning && "spin")}>
          <div className="record-label" />
        </div>
        {/* Green or red glow over the record after a guess. */}
        <div
          aria-hidden
          className={clsx(
            "deck-glow pointer-events-none absolute inset-0 rounded-full",
            swap?.correct === true && "deck-glow-good",
            swap?.correct === false && "deck-glow-bad",
          )}
        />
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={onToggle}
          aria-label={active ? t.common.pause : t.common.play}
          aria-keyshortcuts="Space"
          className={clsx(
            "record-button absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition hover:scale-105 active:scale-95 disabled:opacity-40",
            small ? "size-600" : "size-800",
          )}
        >
          <DeckPlayIcon pause={active} small={small} />
        </button>
      </div>
    </div>
  );
}

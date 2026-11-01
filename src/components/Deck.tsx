"use client";

import { type RefObject, useLayoutEffect, useRef } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useRecordLanding } from "@/lib/recordFlight";
import { smoothScrollToCenter } from "@/lib/smoothScroll";
import { formatTime, type HiddenPlayer } from "@/lib/youtube";

/**
 * A result animation on the record. "next" glows, swipes out in the reading
 * direction and brings the next record in; "last" glows and swipes out for
 * good; "flash" only glows.
 */
export type DeckSwap = { correct: boolean; kind: "next" | "last" | "flash" };

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
};

/**
 * The turntable. The YouTube iframe lives underneath the record and is fully
 * covered, so the title, channel, thumbnail and comments are never visible.
 */
export default function Deck({
  hostRef,
  player,
  videoId,
  start = 0,
  label,
  onSkip,
  onPlay,
  swap,
  onSwapEnd,
}: Props) {
  const { t } = useI18n();
  const isCurrent = videoId !== null && player.currentId === videoId;
  const playing = isCurrent && player.status === "playing";
  const loading = isCurrent && player.status === "loading";
  const errored = isCurrent && player.status === "error";
  const busy = loading || !player.ready;
  const statusText = !player.ready ? t.common.loadingPlayer : loading ? t.common.loadingSong : "";

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
    if (!swapping || !box) return;
    const r = box.getBoundingClientRect();
    if (r.top >= 0 && r.bottom <= window.innerHeight) return;
    return smoothScrollToCenter(box);
  }, [swapping]);

  return (
    // While the record swipes, clip sideways so the page doesn't scroll horizontally.
    // Only then, so the flight from the home page is never clipped.
    <div className={`flex flex-col items-center gap-4 ${swap ? "overflow-x-clip" : ""}`}>
      <div ref={boxRef} className="relative aspect-square w-56 sm:w-64">
        {/* Loading ring: always mounted and faded in/out so nothing shifts. */}
        <div
          aria-hidden
          className={`loading-ring pointer-events-none absolute -inset-2.5 rounded-full transition-opacity duration-300 ${
            busy ? "opacity-100" : "opacity-0 [animation-play-state:paused]"
          }`}
        />
        {/*
          The player, record and button move together, so the iframe stays
          covered for the whole swipe.
        */}
        <div
          className={`absolute inset-0 ${swap ? `deck-swap deck-swap-${swap.kind}` : ""}`}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) onSwapEnd?.();
          }}
        >
          {/*
            Hidden player: must stay mounted and must stay covered. `inert` also keeps
            the YouTube iframe out of the Tab order and away from screen readers.
          */}
          <div
            ref={hostRef}
            inert
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
          />
          {/* Opaque record covering the player entirely. */}
          <div className={`record absolute inset-0 rounded-full ${playing ? "spin" : ""}`}>
            <div className="record-label" />
          </div>
          {/* Green or red glow over the record after a guess. */}
          <div
            aria-hidden
            className={`deck-glow pointer-events-none absolute inset-0 rounded-full ${
              swap ? (swap.correct ? "deck-glow-good" : "deck-glow-bad") : ""
            }`}
          />
          <button
            ref={buttonRef}
            type="button"
            disabled={!player.ready || !videoId || Boolean(swap)}
            onClick={() => {
              if (!videoId) return;
              if (!playing && !loading) onPlay?.();
              player.toggle(videoId, start);
            }}
            aria-label={playing || loading ? t.common.pause : t.common.play}
            className="absolute top-1/2 left-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-lg shadow-black/40 transition hover:scale-105 active:scale-95 disabled:opacity-40"
          >
            {playing || loading ? (
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7" fill="currentColor" aria-hidden>
                {/* Play icons point right in every language, so this offset stays physical. */}
                <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {label && (
        <div className="mt-1 text-xs font-bold tracking-[0.3em] text-muted uppercase rtl:tracking-normal">
          {label}
        </div>
      )}
      <div className="flex items-center gap-3 text-sm text-muted">
        <span dir="ltr" className="w-12 text-end font-mono tabular-nums">
          {isCurrent ? formatTime(player.time) : "0:00"}
        </span>
        <button
          type="button"
          disabled={!isCurrent}
          onClick={() => player.restart(start)}
          className="rounded-full border border-line px-3 py-1 transition hover:bg-white/5 disabled:opacity-40"
        >
          {t.common.restart}
        </button>
      </div>

      {/* Fixed-height status line so the page doesn't jump when loading ends. */}
      {!errored && (
        <p role="status" aria-live="polite" className="h-5 text-sm leading-5 text-muted">
          {statusText}
        </p>
      )}
      {errored && (
        <div className="max-w-xs text-center text-sm text-amber-300">
          {t.common.cantPlay}
          {onSkip && (
            <button type="button" onClick={onSkip} className="mt-2 block w-full underline">
              {t.common.differentSong}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

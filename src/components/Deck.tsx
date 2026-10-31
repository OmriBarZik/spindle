"use client";

import { formatTime, type HiddenPlayer } from "@/lib/youtube";

type Props = {
  hostRef: React.RefObject<HTMLDivElement | null>;
  player: HiddenPlayer;
  /** The song this deck plays when the big button is pressed. */
  videoId: string | null;
  start?: number;
  label?: string;
  accent?: string;
  onSkip?: () => void;
};

/**
 * The turntable. The YouTube iframe lives underneath the record and is fully
 * covered, so the title, channel, thumbnail and comments are never visible.
 */
export default function Deck({ hostRef, player, videoId, start = 0, label, accent, onSkip }: Props) {
  const isCurrent = videoId !== null && player.currentId === videoId;
  const playing = isCurrent && player.status === "playing";
  const loading = isCurrent && player.status === "loading";
  const errored = isCurrent && player.status === "error";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative aspect-square w-56 sm:w-64">
        {/* Hidden player — must stay mounted and must stay covered. */}
        <div
          ref={hostRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
        />
        {/* Opaque record covering the player entirely. */}
        <div
          className={`record absolute inset-0 rounded-full ${playing ? "spin" : ""}`}
          style={accent ? ({ "--label": accent } as React.CSSProperties) : undefined}
        >
          <div className="record-label" />
        </div>
        <button
          type="button"
          disabled={!player.ready || !videoId}
          onClick={() => videoId && player.toggle(videoId, start)}
          aria-label={playing ? "Pause" : "Play"}
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-lg shadow-black/40 transition hover:scale-105 active:scale-95 disabled:opacity-40"
        >
          {loading ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-black/20 border-t-black" />
          ) : playing ? (
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7" fill="currentColor">
              <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
            </svg>
          )}
        </button>
      </div>

      {label && (
        <div className="-mt-1 text-xs font-bold uppercase tracking-[0.3em] text-muted">{label}</div>
      )}
      <div className="flex items-center gap-3 text-sm text-muted">
        <span className="w-12 text-right font-mono tabular-nums">
          {isCurrent ? formatTime(player.time) : "0:00"}
        </span>
        <button
          type="button"
          disabled={!isCurrent}
          onClick={() => player.restart(start)}
          className="rounded-full border border-line px-3 py-1 transition hover:bg-white/5 disabled:opacity-40"
        >
          ↺ Restart
        </button>
      </div>

      {!player.ready && <p className="text-sm text-muted">Loading player…</p>}
      {errored && (
        <div className="max-w-xs text-center text-sm text-amber-300">
          This song can&apos;t be played here (YouTube blocked or removed it).
          {onSkip && (
            <button type="button" onClick={onSkip} className="mt-2 block w-full underline">
              Give me a different song
            </button>
          )}
        </div>
      )}
    </div>
  );
}

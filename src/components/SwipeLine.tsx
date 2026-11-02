"use client";

import {
  Fragment,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import ExternalLink from "@/components/ExternalLink";
import { useI18n } from "@/i18n/I18nProvider";
import { canAnimate } from "@/lib/motion";
import { getSong, songNames } from "@/lib/songs";
import { slotLabel } from "@/lib/timeline";

/** One card on the line: a song, or the starting year (`song: null`). */
export type LineItem = {
  key: string;
  year: number;
  song: { title: string; artist: string; youtubeId: string } | null;
  variant?: "plain" | "good" | "bad";
  note?: string;
};

/** The gap the record starts on: the middle of the line. */
export function defaultSlot(count: number): number {
  return Math.ceil(count / 2);
}

/**
 * The line as a sideways strip of cards hanging off a time rail, each with its
 * year on the rail. While placing, the record sits still in the middle and the
 * player swipes the strip under it: the two songs either side light up and the
 * stretch of rail between their years glows, so "it came out between these two
 * years" reads without words. Slot `i` = before `items[i]`.
 *
 * When not placing, the record (if any) sits above the strip, which is centered
 * on `focus`.
 */
export default function SwipeLine({
  items,
  slot,
  onSlot,
  focus = 0,
  record,
  reveal = false,
}: {
  items: readonly LineItem[];
  /** The gap under the record, or null when not placing. */
  slot: number | null;
  onSlot: (slot: number) => void;
  focus?: number;
  record?: ReactNode;
  /** The answer is showing beside the record: no glow, and the strip can't choose. */
  reveal?: boolean;
}) {
  const { t } = useI18n();
  const placing = slot !== null;
  const choosing = placing && !reveal;
  const count = items.length;
  const trackRef = useRef<HTMLDivElement>(null);
  // The gap last reported by (or steered to on behalf of) the player.
  const shownRef = useRef<number | null>(null);
  const countRef = useRef(count);
  // While we scroll the strip ourselves, its passing gaps aren't the player's choice.
  const steeringRef = useRef(false);
  const steerTimerRef = useRef(0);
  // A swipe tells React (and so the place button) only once the strip comes to rest.
  const reportTimerRef = useRef(0);
  // 1 for left-to-right, −1 for right-to-left; read once, not on every scroll.
  const dirRef = useRef(1);

  const settle = useCallback(() => {
    window.clearTimeout(steerTimerRef.current);
    steerTimerRef.current = window.setTimeout(() => {
      steeringRef.current = false;
    }, 140);
  }, []);

  // Follow `slot` when it changes from outside (a button, a new song), and
  // re-center when the line itself changes. Nothing here runs while scrolling.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    dirRef.current = direction(track);
    const lineChanged = countRef.current !== count;
    countRef.current = count;
    // Glide only for players who haven't asked for reduced motion.
    const behavior = (smooth: boolean) => (smooth && canAnimate() ? "smooth" : "instant");
    if (slot === null) {
      shownRef.current = null;
      const item = track.querySelector(`[data-item="${focus}"]`);
      if (!item) return;
      const r = item.getBoundingClientRect();
      const box = track.getBoundingClientRect();
      track.scrollBy({
        left: r.left + r.width / 2 - (box.left + box.width / 2),
        behavior: "instant",
      });
      return;
    }
    if (slot !== shownRef.current || lineChanged) {
      const first = shownRef.current === null || lineChanged;
      shownRef.current = slot;
      steeringRef.current = true;
      // Gap `slot` is centered at scrollLeft = slot × PITCH (negative in RTL).
      track.scrollTo({ left: dirRef.current * slot * PITCH, behavior: behavior(!first) });
      settle();
    }
  }, [slot, count, focus, settle]);

  useEffect(
    () => () => {
      window.clearTimeout(steerTimerRef.current);
      window.clearTimeout(reportTimerRef.current);
    },
    [],
  );

  // The browser scrolls the strip and moves the glow with it (it lives inside the
  // strip), so a swipe costs almost no JavaScript:
  // - the gap under the record comes from scrollLeft (no layout reads),
  // - crossing into a new gap only moves three CSS classes (the glow and the two
  //   lit cards), with no React render,
  // - React hears about it once the strip is still, which re-renders the place
  //   button. Rendering the whole game on every gap crossed is what made swipes lag.
  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    if (steeringRef.current) {
      settle();
      return;
    }
    if (!choosing) return;
    const gap = Math.round((dirRef.current * track.scrollLeft) / PITCH);
    const best = Math.max(0, Math.min(count, gap));
    if (best !== shownRef.current) {
      shownRef.current = best;
      light(track, best);
    }
    window.clearTimeout(reportTimerRef.current);
    reportTimerRef.current = window.setTimeout(() => {
      if (shownRef.current !== null && shownRef.current !== slot) onSlot(shownRef.current);
    }, 100);
  }

  function step(delta: number) {
    if (slot === null) return;
    const next = Math.max(0, Math.min(count, slot + delta));
    if (next !== slot) onSlot(next);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!choosing) return;
    const rtl = trackRef.current ? getComputedStyle(trackRef.current).direction === "rtl" : false;
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    if (e.key === forward) step(1);
    else if (e.key === back) step(-1);
    else if (e.key === "Home") onSlot(0);
    else if (e.key === "End") onSlot(count);
    else return;
    e.preventDefault();
  }

  /** Tapping the overview bar jumps to that part of the line. */
  function onMapDown(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    let f = (e.clientX - r.left) / r.width;
    if (rtl) f = 1 - f;
    onSlot(Math.round(Math.max(0, Math.min(1, f)) * count));
  }

  const flank = (i: number) => choosing && (i === slot - 1 || i === slot);

  return (
    <div className="flex w-full flex-col gap-3">
      <div className={placing ? "swipe" : "swipe swipe-done"}>
        {/* Scrollable, so it must be reachable by keyboard; arrows move the record. */}
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- arrow keys mirror the Earlier/Later buttons */}
        <div
          ref={trackRef}
          role="group"
          aria-label={t.common.lineLabel}
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- axe's scrollable-region-focusable needs it
          tabIndex={0}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          className="swipe-track"
        >
          <ol className="swipe-list">
            {items.map((item, i) => (
              <Fragment key={item.key}>
                {placing && <Gap slot={i} count={count} on={choosing && slot === i} />}
                <SwipeCard item={item} index={i} lit={flank(i)} />
              </Fragment>
            ))}
            {placing && <Gap slot={count} count={count} on={choosing && slot === count} />}
          </ol>
        </div>
        {record && (
          <div className="swipe-record">
            {record}
            {choosing && (
              <>
                <span aria-hidden className="swipe-drop" />
                <span aria-hidden className="swipe-pin">
                  ?
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {placing && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={!choosing || slot === 0}
            aria-label={t.common.earlier}
            className="swipe-step"
          >
            <span aria-hidden className="rtl:-scale-x-100">
              ‹
            </span>
          </button>
          {/* A shortcut for pointers; the buttons and arrow keys do the same. */}
          <div aria-hidden className="swipe-map" onPointerDown={choosing ? onMapDown : undefined}>
            {items.map((item, i) => (
              <Fragment key={item.key}>
                <span className={i === slot ? "swipe-map-gap swipe-map-on" : "swipe-map-gap"} />
                <span className={item.song ? "swipe-map-dot" : "swipe-map-dot swipe-map-anchor"} />
              </Fragment>
            ))}
            <span className={slot === count ? "swipe-map-gap swipe-map-on" : "swipe-map-gap"} />
          </div>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={!choosing || slot === count}
            aria-label={t.common.later}
            className="swipe-step"
          >
            <span aria-hidden className="rtl:-scale-x-100">
              ›
            </span>
          </button>
          <p aria-live="polite" className="sr-only">
            {slotLabel(items, slot, t.placeAt)}
          </p>
        </div>
      )}
    </div>
  );
}

/** Distance between neighbouring gaps: a gap (156px) plus a card (104px), as in `globals.css`. */
const PITCH = 260;

/**
 * Light gap `slot` and the cards either side of it, ahead of React. React renders
 * the same classes once it hears of the gap, so the two never disagree for long.
 */
function light(track: HTMLElement, slot: number) {
  for (const el of track.querySelectorAll(".swipe-gap-on")) el.classList.remove("swipe-gap-on");
  for (const el of track.querySelectorAll(".swipe-lit")) el.classList.remove("swipe-lit");
  track.querySelector(`[data-gap="${slot}"]`)?.classList.add("swipe-gap-on");
  for (const i of [slot - 1, slot]) {
    track.querySelector(`[data-item="${i}"]`)?.classList.add("swipe-lit");
  }
}

/** 1 for left-to-right, −1 for right-to-left (where scrollLeft counts down from 0). */
function direction(el: Element): number {
  return getComputedStyle(el).direction === "rtl" ? -1 : 1;
}

/**
 * A gap between two cards. Its glow spans the rail from the older card's year to
 * the newer one's; it only shows on the gap under the record, and fades in and out
 * there (opacity only), so moving between gaps costs no layout.
 */
function Gap({ slot, count, on }: { slot: number; count: number; on: boolean }) {
  const open = slot === 0 ? " swipe-glow-open-start" : slot === count ? " swipe-glow-open-end" : "";
  return (
    <li aria-hidden className={on ? "swipe-gap swipe-gap-on" : "swipe-gap"} data-gap={slot}>
      <span className={`swipe-glow${open}`} />
    </li>
  );
}

function SwipeCard({ item, index, lit }: { item: LineItem; index: number; lit: boolean }) {
  const { t } = useI18n();
  const variant = item.song
    ? { plain: "", good: "card-good", bad: "card-bad" }[item.variant ?? "plain"]
    : "card-anchor";
  return (
    <li className={lit ? "swipe-item swipe-lit" : "swipe-item"} data-item={index}>
      <div className={`card swipe-card ${variant}`}>
        <span className="text-2xl leading-none font-black tabular-nums">{item.year}</span>
        {item.song ? (
          <CardNames song={item.song} />
        ) : (
          <span className="text-sm text-muted">{t.common.startingYear}</span>
        )}
        {item.note && <span className="text-xs font-semibold">{item.note}</span>}
      </div>
      {/* The card's spot on the time rail. */}
      <span aria-hidden className="swipe-stem" />
      <span aria-hidden className="swipe-node" />
      <span aria-hidden className="swipe-year">
        {item.year}
      </span>
    </li>
  );
}

function CardNames({ song }: { song: { title: string; artist: string; youtubeId: string } }) {
  const { lang, t } = useI18n();
  const { title, artist } = songNames(song, lang);
  // Saved cards may still hold a video that has since been replaced; link the current one.
  const youtubeId = getSong(song.youtubeId)?.youtubeId ?? song.youtubeId;
  return (
    <>
      {/* Titles and artists are mostly Latin; <bdi> keeps them intact in RTL pages. */}
      <span className="line-clamp-2 text-sm leading-snug font-bold">
        <bdi>{title}</bdi>
      </span>
      <span className="truncate text-xs text-muted">
        <bdi>{artist}</bdi>
      </span>
      <ExternalLink
        href={`https://www.youtube.com/watch?v=${youtubeId}`}
        className="mt-auto text-xs text-muted underline decoration-dotted underline-offset-2 hover:text-white"
      >
        {t.common.watch}
      </ExternalLink>
    </>
  );
}

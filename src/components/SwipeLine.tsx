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
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLDivElement>(null);
  // The gap last reported by (or steered to on behalf of) the player.
  const shownRef = useRef<number | null>(null);
  const countRef = useRef(count);
  // While we scroll the strip ourselves, its passing gaps aren't the player's choice.
  const steeringRef = useRef(false);
  const steerTimerRef = useRef(0);
  const frameRef = useRef(0);

  /** Where each piece is on screen, in the strip's reading direction. */
  const geometry = useCallback(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage) return null;
    const rtl = getComputedStyle(track).direction === "rtl";
    const box = track.getBoundingClientRect();
    const mid = box.left + box.width / 2;
    return { track, stage, rtl, box, mid };
  }, []);

  /** Recede the cards away from the middle, and stretch the glow between the lit years. */
  const paint = useCallback(() => {
    const g = geometry();
    if (!g) return;
    for (const card of g.track.querySelectorAll<HTMLElement>("[data-card]")) {
      const r = card.getBoundingClientRect();
      const d = Math.min(1, Math.max(0, Math.abs(r.left + r.width / 2 - g.mid) - 150) / 260);
      card.style.transform = d ? `scale(${1 - d * 0.12})` : "";
      card.style.opacity = d ? String(1 - d * 0.5) : "";
    }
    const span = spanRef.current;
    const at = shownRef.current;
    if (!span || at === null) return;
    const stageBox = g.stage.getBoundingClientRect();
    const nodeX = (i: number) => {
      const node = g.track.querySelector(`[data-node="${i}"]`);
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return r.left + r.width / 2 - stageBox.left;
    };
    // With no song on one side, the glow runs out to that edge (older is left in LTR).
    const older = nodeX(at - 1) ?? (g.rtl ? stageBox.width : 0);
    const newer = nodeX(at) ?? (g.rtl ? 0 : stageBox.width);
    const openOld = at === 0;
    const openNew = at === countRef.current;
    // Stop short of the lit nodes so they stay on top of the glow.
    const inset = (open: boolean) => (open ? 0 : 9);
    const leftInset = inset(g.rtl ? openNew : openOld);
    const rightInset = inset(g.rtl ? openOld : openNew);
    const x0 = Math.min(older, newer) + leftInset;
    const x1 = Math.max(older, newer) - rightInset;
    span.style.left = `${x0}px`;
    span.style.width = `${Math.max(0, x1 - x0)}px`;
    span.classList.toggle("swipe-span-fade-left", g.rtl ? openNew : openOld);
    span.classList.toggle("swipe-span-fade-right", g.rtl ? openOld : openNew);
  }, [geometry]);

  /** The gap nearest the middle of the strip. */
  const nearestGap = useCallback(() => {
    const g = geometry();
    if (!g) return null;
    let best: number | null = null;
    let bestDistance = Infinity;
    for (const gap of g.track.querySelectorAll<HTMLElement>("[data-gap]")) {
      const r = gap.getBoundingClientRect();
      const distance = Math.abs(r.left + r.width / 2 - g.mid);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = Number(gap.dataset.gap);
      }
    }
    return best;
  }, [geometry]);

  /** Scroll so `selector`'s element is in the middle of the strip. */
  const center = useCallback(
    (selector: string, smooth: boolean) => {
      const g = geometry();
      const el = g?.track.querySelector(selector);
      if (!g || !el) return;
      const r = el.getBoundingClientRect();
      // Glide only for players who haven't asked for reduced motion.
      g.track.scrollBy({
        left: r.left + r.width / 2 - g.mid,
        behavior: smooth && canAnimate() ? "smooth" : "instant",
      });
    },
    [geometry],
  );

  const settle = useCallback(() => {
    window.clearTimeout(steerTimerRef.current);
    steerTimerRef.current = window.setTimeout(() => {
      steeringRef.current = false;
    }, 140);
  }, []);

  // Follow `slot` when it changes from outside (a button, a new song), and
  // re-center when the line itself changes.
  useLayoutEffect(() => {
    const lineChanged = countRef.current !== count;
    countRef.current = count;
    if (slot === null) {
      shownRef.current = null;
      center(`[data-item="${focus}"]`, false);
      paint();
      return;
    }
    if (slot !== shownRef.current || lineChanged) {
      const first = shownRef.current === null || lineChanged;
      shownRef.current = slot;
      steeringRef.current = true;
      center(`[data-gap="${slot}"]`, !first);
      settle();
    }
    paint();
  }, [slot, count, focus, center, paint, settle]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      window.clearTimeout(steerTimerRef.current);
    },
    [],
  );

  function onScroll() {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      if (steeringRef.current) {
        settle();
      } else if (choosing) {
        const best = nearestGap();
        if (best !== null && best !== shownRef.current) {
          shownRef.current = best;
          onSlot(best);
        }
      }
      paint();
    });
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
      <div ref={stageRef} className={placing ? "swipe" : "swipe swipe-done"}>
        {choosing && <div ref={spanRef} aria-hidden className="swipe-span" />}
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
                {placing && <li aria-hidden className="swipe-gap" data-gap={i} />}
                <SwipeCard item={item} index={i} lit={flank(i)} />
              </Fragment>
            ))}
            {placing && <li aria-hidden className="swipe-gap" data-gap={count} />}
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

function SwipeCard({ item, index, lit }: { item: LineItem; index: number; lit: boolean }) {
  const { t } = useI18n();
  const variant = item.song
    ? { plain: "", good: "card-good", bad: "card-bad" }[item.variant ?? "plain"]
    : "card-anchor";
  return (
    <li className={lit ? "swipe-item swipe-lit" : "swipe-item"} data-item={index}>
      <div data-card className={`card swipe-card ${variant}`}>
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
      <span aria-hidden className="swipe-node" data-node={index} />
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

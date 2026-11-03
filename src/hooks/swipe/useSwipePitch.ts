"use client";

import { type RefObject, useCallback, useEffect, useEffectEvent, useRef } from "react";

/**
 * Distance between neighbouring gaps on a phone: a gap (160px) plus a card (104px),
 * as in `tokens.css`. Desktops get bigger cards (`--swipe-*` under `lg`), so the strip
 * measures its real pitch (`measurePitch`) rather than trusting this.
 */
export const PITCH = 264;

/** A gap plus a card, as laid out now; `PITCH` when the strip has no gaps (not placing). */
function measurePitch(track: HTMLElement): number {
  const gap = track.querySelector<HTMLElement>(".swipe-gap");
  const card = track.querySelector<HTMLElement>(".swipe-item");
  return gap && card ? gap.offsetWidth + card.offsetWidth : PITCH;
}

/**
 * Scrolls gap `slot` to the middle of the strip, under the record. It measures the gap
 * rather than using `slot × pitch`, which is off by half the difference between a gap
 * and a card (the strip's padding centres a card); snapping covers that after a swipe,
 * but not after a drag or a resize. Only for those: it reads layout.
 */
export function centreGap(track: HTMLElement, slot: number, behavior: ScrollBehavior) {
  const gap = track.querySelector(`[data-gap="${slot}"]`);
  if (!gap) {
    return;
  }
  const r = gap.getBoundingClientRect();
  const box = track.getBoundingClientRect();
  const by = r.left + r.width / 2 - (box.left + box.width / 2);
  track.scrollTo({ left: track.scrollLeft + by, behavior });
}

/**
 * The strip's pitch, kept in a ref so the scroll handler never reads layout. It's
 * measured when the strip mounts or resizes (a window crossing the desktop width),
 * and `onResize` then puts the record back on its gap.
 */
export function useSwipePitch(
  trackRef: RefObject<HTMLElement | null>,
  onResize: (pitch: number) => void,
) {
  const pitchRef = useRef(PITCH);
  const resized = useEffectEvent(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    const pitch = measurePitch(track);
    if (pitch !== pitchRef.current) {
      pitchRef.current = pitch;
      onResize(pitch);
    }
  });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    // ResizeObserver also fires once on observe, which takes the first measurement.
    const observer = new ResizeObserver(() => resized());
    observer.observe(track);
    return () => observer.disconnect();
  }, [trackRef]);

  /** Measures again now (the strip may have just gained its gaps). */
  const measure = useCallback(() => {
    const track = trackRef.current;
    if (track) {
      pitchRef.current = measurePitch(track);
    }
  }, [trackRef]);

  return { pitchRef, measure };
}

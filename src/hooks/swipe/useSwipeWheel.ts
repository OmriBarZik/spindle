"use client";

import { type RefObject, useEffect, useEffectEvent, useRef } from "react";
import { directionSign } from "@/lib/line/directionSign";

/** Wheel travel (px) that moves the record one gap, and the pause after each move. */
const WHEEL_STEP = 40;
const WHEEL_REST_MS = 150;

/** WheelEvent deltas can come in lines or pages; this is roughly px. */
function wheelPixels(e: WheelEvent): number {
  if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return e.deltaY * 16;
  }
  return e.deltaMode === WheelEvent.DOM_DELTA_PAGE ? e.deltaY * window.innerHeight : e.deltaY;
}

/** Scrolls a finished strip sideways, unless it's already at that end. */
function scrollFree(track: HTMLElement, delta: number, e: WheelEvent) {
  const max = track.scrollWidth - track.clientWidth;
  const at = Math.abs(track.scrollLeft);
  if ((delta > 0 && at >= max - 1) || (delta < 0 && at <= 0)) {
    return;
  }
  e.preventDefault();
  track.scrollBy({ left: directionSign(track) * delta, behavior: "instant" });
}

/**
 * A mouse wheel turns the strip: while placing, each notch moves the record one gap
 * (down is later); on a finished line it scrolls the strip sideways. Sideways wheels
 * and trackpads already scroll it, and at either end the page scrolls as usual.
 */
export function useSwipeWheel({
  trackRef,
  choosing,
  browse,
  slot,
  count,
  onStep,
}: {
  trackRef: RefObject<HTMLDivElement | null>;
  choosing: boolean;
  /** A finished line, which the wheel scrolls freely. */
  browse: boolean;
  /** The gap under the record, or null when not placing. */
  slot: () => number | null;
  count: number;
  onStep: (delta: number) => void;
}) {
  // Wheel travel since the last step, and when the next step may come.
  const stateRef = useRef({ acc: 0, restUntil: 0 });

  /** One gap per notch (or per `WHEEL_STEP` of trackpad travel), with a short rest after each. */
  function stepRecord(delta: number, e: WheelEvent) {
    const from = slot();
    const down = delta > 0;
    if (from === null || (down && from >= count) || (!down && from <= 0)) {
      return;
    }
    e.preventDefault();
    const state = stateRef.current;
    if (e.timeStamp < state.restUntil) {
      return;
    }
    state.acc += delta;
    if (Math.abs(state.acc) >= WHEEL_STEP) {
      onStep(down ? 1 : -1);
      state.acc = 0;
      state.restUntil = e.timeStamp + WHEEL_REST_MS;
    }
  }

  const onWheel = useEffectEvent((e: WheelEvent) => {
    const track = trackRef.current;
    if (!track || e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) {
      return;
    }
    const delta = wheelPixels(e);
    if (browse) {
      scrollFree(track, delta, e);
    } else if (choosing) {
      stepRecord(delta, e);
    }
  });

  useEffect(() => {
    // The whole line, record included: the record sits on top of the strip.
    const line = trackRef.current?.parentElement;
    if (!line) {
      return;
    }
    // Not passive, so it can stop the page from scrolling while the strip turns.
    line.addEventListener("wheel", onWheel, { passive: false });
    return () => line.removeEventListener("wheel", onWheel);
  }, [trackRef]);
}

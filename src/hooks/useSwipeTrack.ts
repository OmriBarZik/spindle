"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { clamp } from "@/lib/clamp";
import { directionSign } from "@/lib/directionSign";
import type { LiveSlot } from "@/lib/liveSlot";
import { canAnimate } from "@/lib/motion";
import { centreGap, useSwipePitch } from "./useSwipePitch";

/**
 * Light gap `slot` and the cards either side of it, ahead of React. React renders
 * the same classes once it hears of the gap, so the two never disagree for long.
 */
function light(track: HTMLElement, slot: number) {
  for (const el of track.querySelectorAll(".swipe-gap-on")) {
    el.classList.remove("swipe-gap-on");
  }
  for (const el of track.querySelectorAll(".swipe-lit")) {
    el.classList.remove("swipe-lit");
  }
  track.querySelector(`[data-gap="${slot}"]`)?.classList.add("swipe-gap-on");
  for (const i of [slot - 1, slot]) {
    track.querySelector(`[data-item="${i}"]`)?.classList.add("swipe-lit");
  }
}

/** Keeps the scrolling strip and the chosen gap in step, in both directions. */
export function useSwipeTrack({
  slot,
  count,
  focus,
  choosing,
  live,
  onSlot,
}: {
  slot: number | null;
  count: number;
  focus: number;
  choosing: boolean;
  live: LiveSlot;
  onSlot: (slot: number) => void;
}) {
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

  // The strip changed size (cards grow on a desktop): keep the record on its gap.
  const { pitchRef, measure } = useSwipePitch(trackRef, () => {
    const track = trackRef.current;
    if (!track || shownRef.current === null) {
      return;
    }
    steeringRef.current = true;
    centreGap(track, shownRef.current, "instant");
    settle();
  });

  // Follow `slot` when it changes from outside (a button, a new song), and
  // re-center when the line itself changes. Nothing here runs while scrolling.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    dirRef.current = directionSign(track);
    measure();
    const lineChanged = countRef.current !== count;
    countRef.current = count;
    // Glide only for players who haven't asked for reduced motion.
    const behavior = (smooth: boolean) => (smooth && canAnimate() ? "smooth" : "instant");
    if (slot === null) {
      shownRef.current = null;
      live.set(null);
      const item = track.querySelector(`[data-item="${focus}"]`);
      if (!item) {
        return;
      }
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
      live.set(slot);
      steeringRef.current = true;
      centreGap(track, slot, behavior(!first));
      settle();
    }
  }, [slot, count, focus, settle, live, measure]);

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
    if (!track) {
      return;
    }
    if (steeringRef.current) {
      settle();
      return;
    }
    if (!choosing) {
      return;
    }
    const best = clamp(
      Math.round((dirRef.current * track.scrollLeft) / pitchRef.current),
      0,
      count,
    );
    if (best !== shownRef.current) {
      shownRef.current = best;
      light(track, best);
      // The place button and the overview bar follow at once.
      live.set(best);
    }
    window.clearTimeout(reportTimerRef.current);
    reportTimerRef.current = window.setTimeout(() => {
      if (shownRef.current !== null && shownRef.current !== slot) {
        onSlot(shownRef.current);
      }
    }, 100);
  }

  /** The player grabbed the strip (a mouse drag): its scrolling is theirs, even mid-glide. */
  function takeOver() {
    window.clearTimeout(steerTimerRef.current);
    steeringRef.current = false;
  }

  return { trackRef, pitchRef, onScroll, takeOver };
}

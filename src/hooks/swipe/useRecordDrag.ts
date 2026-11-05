"use client";

import {
  type MouseEvent,
  type PointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { directionSign } from "@/lib/line/directionSign";

/** How far (px) a mouse moves before a press becomes a drag rather than a click. */
const DRAG_START = 5;

/** While the record is held against a card, the line takes another step this often (ms). */
const REPEAT = 400;

/** The most (px) the record can be dragged up or down. */
const SLACK = 24;

/** How far the record follows the mouse up or down: right with it, up to `SLACK`. */
function giveOf(dy: number): number {
  return Math.max(-SLACK, Math.min(SLACK, dy));
}

type Drag = {
  id: number;
  x: number;
  y: number;
  moved: boolean;
  /** −1 or 1 while the record is held against a neighbouring card (screen direction). */
  pushing: -1 | 0 | 1;
  /** The record being held. */
  el: HTMLElement;
  /** Removes the page-wide listeners that catch a release the record never hears of. */
  unlisten: AbortController;
};

/** Puts the record down: back to the middle, over the chosen gap, with a bounce (swipe.css). */
function putDown(el: HTMLElement) {
  el.classList.remove("swipe-lifted", "swipe-dragging");
  el.style.translate = "";
}

/**
 * Let go outside the record, or outside the window, or the window loses focus (a switch
 * to another app): the record may never hear the release, so the page listens too.
 */
function listenForRelease(release: () => void): AbortController {
  const unlisten = new AbortController();
  const options = { signal: unlisten.signal };
  window.addEventListener("pointerup", release, options);
  window.addEventListener("pointercancel", release, options);
  window.addEventListener("blur", release, options);
  return unlisten;
}

/**
 * Whether a press can grab the record: the main mouse button, on the vinyl. The play
 * button in the middle is for playing, never for dragging; touch only taps.
 */
function grabs(e: PointerEvent<HTMLDivElement>): boolean {
  const onPlay = e.target instanceof Element && e.target.closest("button");
  return e.pointerType === "mouse" && e.button === 0 && !onPlay;
}

/** Which card the record is held against: −1 the left one, 1 the right one, 0 neither. */
function sideOf(dx: number, reach: number): -1 | 0 | 1 {
  if (Math.abs(dx) < reach) {
    return 0;
  }
  return dx < 0 ? -1 : 1;
}

/**
 * The record under the mouse (`.swipe-grab`, desktop only; touch only taps it to play).
 * Pressed, it lifts off the line (`.swipe-lifted`). Dragged, it follows the mouse over a
 * line that stays still, until it reaches the year card beside its gap; there it pushes
 * the line one gap that way, and keeps pushing a gap at a time while it's held against
 * the card. It can be dragged a little up and down too (`giveOf`). Let go, it drops back onto the gap in the middle, the one now chosen.
 */
export function useRecordDrag({
  trackRef,
  pitchRef,
  choosing,
  onStep,
}: {
  trackRef: RefObject<HTMLDivElement | null>;
  /** The strip's gap-to-gap distance (`useSwipePitch`); a card sits half of it away. */
  pitchRef: RefObject<number>;
  choosing: boolean;
  /** Moves the chosen gap by `delta` in reading direction. */
  onStep: (delta: number) => void;
}) {
  const dragRef = useRef<Drag | null>(null);
  // A drag ends with a click on the play button under the mouse: swallow it.
  const draggedRef = useRef(false);
  const repeatRef = useRef(0);

  /**
   * Lets go of the record, however the drag ended. Safe to call twice: the record's own
   * pointerup and the page's both arrive for one release.
   */
  const release = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }
    dragRef.current = null;
    window.clearInterval(repeatRef.current);
    drag.unlisten.abort();
    putDown(drag.el);
    // The click that follows a drag isn't a press of the play button.
    draggedRef.current = drag.moved;
  }, []);

  // Leaving the page or the game mid-drag lets go too.
  useEffect(() => release, [release]);
  useEffect(() => {
    if (!choosing) {
      release();
    }
  }, [choosing, release]);

  /** One gap towards `side` (−1 left, 1 right on screen), whatever the reading direction. */
  function push(side: -1 | 1) {
    const track = trackRef.current;
    if (track) {
      onStep(side * directionSign(track));
    }
  }

  /** Starts or stops pushing the line as the record reaches or leaves a card. */
  function pushTowards(drag: Drag, side: -1 | 0 | 1) {
    if (side === drag.pushing) {
      return;
    }
    drag.pushing = side;
    window.clearInterval(repeatRef.current);
    if (side !== 0) {
      push(side);
      repeatRef.current = window.setInterval(() => push(side), REPEAT);
    }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!choosing || !grabs(e)) {
      return;
    }
    release();
    draggedRef.current = false;
    const unlisten = listenForRelease(release);
    const el = e.currentTarget;
    dragRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      pushing: 0,
      el,
      unlisten,
    };
    el.classList.add("swipe-lifted");
  }

  /** The press becomes a drag: the record keeps the mouse wherever it goes. */
  function begin(drag: Drag, e: PointerEvent<HTMLDivElement>) {
    drag.moved = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.classList.add("swipe-dragging");
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) {
      return;
    }
    // The button is up, though no release came (it happened where the page can't see).
    if ((e.buttons & 1) === 0) {
      release();
      return;
    }
    const dx = e.clientX - drag.x;
    if (!drag.moved) {
      // Any direction starts a drag: down or up as well as sideways.
      if (Math.hypot(dx, e.clientY - drag.y) < DRAG_START) {
        return;
      }
      begin(drag, e);
    }
    // The neighbouring card's year is half a pitch away: the record goes no further.
    const reach = pitchRef.current / 2;
    const offset = Math.max(-reach, Math.min(reach, dx));
    e.currentTarget.style.translate = `${offset}px ${giveOf(e.clientY - drag.y)}px`;
    pushTowards(drag, sideOf(dx, reach));
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: release,
    onPointerCancel: release,
    // The browser took the mouse back (a context menu, a lost focus): let go.
    onLostPointerCapture: release,
    // The mouse left the record before the drag began (a quick pull, or a press near
    // its edge): still held, that's a drag; let go, put the record back down.
    onPointerLeave: (e: PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.moved) {
        return;
      }
      if ((e.buttons & 1) === 0) {
        release();
      } else {
        begin(drag, e);
      }
    },
    onClickCapture: (e: MouseEvent<HTMLDivElement>) => {
      if (draggedRef.current) {
        draggedRef.current = false;
        e.preventDefault();
        e.stopPropagation();
      }
    },
    // The record's picture would otherwise start the browser's own drag.
    onDragStart: (e: MouseEvent<HTMLDivElement>) => e.preventDefault(),
  };
}

"use client";

import { type MouseEvent, type PointerEvent, type RefObject, useEffect, useRef } from "react";
import { directionSign } from "@/lib/line/directionSign";

/** How far (px) a mouse moves before a press becomes a drag rather than a click. */
const DRAG_START = 5;

/** While the record is held against a card, the line takes another step this often (ms). */
const REPEAT = 400;

type Drag = {
  id: number;
  x: number;
  moved: boolean;
  /** −1 or 1 while the record is held against a neighbouring card (screen direction). */
  pushing: -1 | 0 | 1;
};

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
 * the card. Let go, it drops back onto the gap in the middle, the one now chosen.
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

  useEffect(() => () => window.clearInterval(repeatRef.current), []);

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

  function release(el: HTMLElement) {
    const drag = dragRef.current;
    dragRef.current = null;
    window.clearInterval(repeatRef.current);
    el.classList.remove("swipe-lifted", "swipe-dragging");
    // Back to the middle, over the chosen gap, with a small bounce (swipe.css).
    el.style.translate = "";
    return drag;
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!choosing || e.pointerType !== "mouse" || e.button !== 0) {
      return;
    }
    draggedRef.current = false;
    dragRef.current = { id: e.pointerId, x: e.clientX, moved: false, pushing: 0 };
    e.currentTarget.classList.add("swipe-lifted");
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) {
      return;
    }
    const dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < DRAG_START) {
        return;
      }
      drag.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.classList.add("swipe-dragging");
    }
    // The neighbouring card's year is half a pitch away: the record goes no further.
    const reach = pitchRef.current / 2;
    const offset = Math.max(-reach, Math.min(reach, dx));
    e.currentTarget.style.translate = `${offset}px 0`;
    pushTowards(drag, sideOf(dx, reach));
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.id !== e.pointerId) {
      return;
    }
    draggedRef.current = Boolean(release(e.currentTarget)?.moved);
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    // Pressed but never dragged, and the mouse slipped off: put it back down.
    onPointerLeave: (e: PointerEvent<HTMLDivElement>) => {
      if (dragRef.current && !dragRef.current.moved) {
        release(e.currentTarget);
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

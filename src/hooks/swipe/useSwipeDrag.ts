"use client";

import { type MouseEvent, type PointerEvent, type RefObject, useRef } from "react";
import { centreGap } from "@/hooks/swipe/useSwipePitch";
import { canAnimate } from "@/lib/display/motion";
import { clamp } from "@/lib/line/clamp";
import { directionSign } from "@/lib/line/directionSign";

/** How far (px) a mouse moves before a press becomes a drag rather than a click. */
const DRAG_START = 5;

/**
 * What is being dragged. Pulling the strip moves it with the mouse; pulling the record
 * moves the record along the line, so the strip slides the other way under it.
 */
type Grip = "strip" | "record";

type Drag = { id: number; x: number; left: number; moved: boolean; grip: Grip };

/**
 * The gap nearest to a point `offset` px right of the strip's middle. Gap `s` sits in
 * the middle at scrollLeft = s × pitch (negative right to left).
 */
function gapAt(track: HTMLElement, offset: number, pitch: number, count: number) {
  const along = directionSign(track) * (track.scrollLeft + offset);
  return clamp(Math.round(along / pitch), 0, count);
}

/** Lets go of the record: it drops back onto the line. */
function drop(e: PointerEvent<HTMLDivElement>) {
  e.currentTarget.classList.remove("swipe-lifted");
}

/**
 * Mouse controls for the line (touch scrolls the strip natively). While placing, the
 * record is what moves: grab it and it lifts off the line, drag it to an earlier or
 * later gap, and let go to drop it there; or click anywhere on the strip to move it to
 * the nearest gap. The strip itself can't be dragged then, only on a finished line, to
 * look through it. Touch never drags the record: a tap on it plays the song. Dragging
 * only sets scrollLeft, so the strip's own scroll handler lights the gaps exactly as it
 * does for a swipe.
 */
export function useSwipeDrag({
  trackRef,
  pitchRef,
  takeOver,
  choosing,
  count,
  onSlot,
}: {
  trackRef: RefObject<HTMLDivElement | null>;
  /** The strip's gap-to-gap distance (`useSwipePitch`). */
  pitchRef: RefObject<number>;
  /** Called when a drag starts, so the strip treats its scrolling as the player's. */
  takeOver: () => void;
  choosing: boolean;
  count: number;
  onSlot: (slot: number) => void;
}) {
  const dragRef = useRef<Drag | null>(null);
  // A drag ends with a click on whatever is under the mouse: swallow it.
  const draggedRef = useRef(false);

  function start(e: PointerEvent<HTMLDivElement>, grip: Grip) {
    const track = trackRef.current;
    if (e.pointerType !== "mouse" || e.button !== 0 || !track) {
      return;
    }
    draggedRef.current = false;
    dragRef.current = { id: e.pointerId, x: e.clientX, left: track.scrollLeft, moved: false, grip };
    if (grip === "record") {
      // It hovers above the line until it's dropped (`.swipe-lifted` in swipe.css).
      e.currentTarget.classList.add("swipe-lifted");
    }
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const track = trackRef.current;
    if (!drag || drag.id !== e.pointerId || !track) {
      return;
    }
    const dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < DRAG_START) {
        return;
      }
      if (drag.grip === "strip" && choosing) {
        // While placing, the strip stays put: only the record moves. Not a click either.
        dragRef.current = null;
        draggedRef.current = true;
        return;
      }
      drag.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.classList.add("swipe-dragging");
      track.classList.add("swipe-dragging");
      takeOver();
    }
    track.scrollLeft = drag.grip === "record" ? drag.left + dx : drag.left - dx;
  }

  /** A click on the strip (not on a link) moves the record to the nearest gap. */
  function click(e: PointerEvent<HTMLDivElement>, track: HTMLElement) {
    const onLink = e.target instanceof Element && e.target.closest("a, button");
    if (choosing && !onLink) {
      const box = track.getBoundingClientRect();
      onSlot(gapAt(track, e.clientX - (box.left + box.width / 2), pitchRef.current, count));
    }
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const track = trackRef.current;
    dragRef.current = null;
    if (!drag || drag.id !== e.pointerId || !track) {
      return;
    }
    if (drag.grip === "record") {
      drop(e);
    }
    if (!drag.moved) {
      // A click on the record is its play button's.
      if (drag.grip === "strip") {
        click(e, track);
      }
      return;
    }
    draggedRef.current = true;
    e.currentTarget.classList.remove("swipe-dragging");
    track.classList.remove("swipe-dragging");
    if (choosing) {
      // Settle on the nearest gap, as snapping would after a swipe.
      centreGap(
        track,
        gapAt(track, 0, pitchRef.current, count),
        canAnimate() ? "smooth" : "instant",
      );
    }
  }

  function onClickCapture(e: MouseEvent<HTMLDivElement>) {
    if (draggedRef.current) {
      draggedRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }

  const shared = {
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onClickCapture,
    // Links, text and the record's picture would otherwise start the browser's own drag.
    onDragStart: (e: MouseEvent<HTMLDivElement>) => e.preventDefault(),
  };

  return {
    strip: { ...shared, onPointerDown: (e: PointerEvent<HTMLDivElement>) => start(e, "strip") },
    /** Only while choosing: the record can't move while the answer shows. */
    record: {
      ...shared,
      onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
        if (choosing) {
          start(e, "record");
        }
      },
      // Pressed but never dragged, and the mouse slipped off: put it back down.
      onPointerLeave: (e: PointerEvent<HTMLDivElement>) => {
        if (dragRef.current?.grip === "record" && !dragRef.current.moved) {
          dragRef.current = null;
          drop(e);
        }
      },
    },
  };
}

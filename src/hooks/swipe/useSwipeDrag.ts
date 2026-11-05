"use client";

import { type MouseEvent, type PointerEvent, type RefObject, useRef } from "react";
import { centreGap } from "@/hooks/swipe/useSwipePitch";
import { canAnimate } from "@/lib/display/motion";
import { clamp } from "@/lib/line/clamp";
import { directionSign } from "@/lib/line/directionSign";

/** How far (px) a mouse moves before a press becomes a drag rather than a click. */
const DRAG_START = 5;

type Drag = { id: number; x: number; left: number; moved: boolean };

/**
 * The gap nearest to a point `offset` px right of the strip's middle. Gap `s` sits in
 * the middle at scrollLeft = s × pitch (negative right to left).
 */
function gapAt(track: HTMLElement, offset: number, pitch: number, count: number) {
  const along = directionSign(track) * (track.scrollLeft + offset);
  return clamp(Math.round(along / pitch), 0, count);
}

/**
 * Mouse controls for the strip (touch scrolls it natively). While placing, a click
 * anywhere on it moves the record to the nearest gap, but the strip itself stays put:
 * the record is what's dragged (`useRecordDrag`). A finished line can be dragged
 * sideways to look through it. Dragging only sets scrollLeft, as a swipe would.
 */
export function useSwipeDrag({
  pitchRef,
  takeOver,
  choosing,
  count,
  onSlot,
}: {
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

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || e.button !== 0) {
      return;
    }
    draggedRef.current = false;
    dragRef.current = {
      id: e.pointerId,
      x: e.clientX,
      left: e.currentTarget.scrollLeft,
      moved: false,
    };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const track = e.currentTarget;
    if (!drag || drag.id !== e.pointerId) {
      return;
    }
    const dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < DRAG_START) {
        return;
      }
      if (choosing) {
        // While placing, the strip stays put: only the record moves. Not a click either.
        dragRef.current = null;
        draggedRef.current = true;
        return;
      }
      drag.moved = true;
      track.setPointerCapture(e.pointerId);
      track.classList.add("swipe-dragging");
      takeOver();
    }
    track.scrollLeft = drag.left - dx;
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
    const track = e.currentTarget;
    dragRef.current = null;
    if (!drag || drag.id !== e.pointerId) {
      return;
    }
    if (!drag.moved) {
      click(e, track);
      return;
    }
    draggedRef.current = true;
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

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onClickCapture,
    // Links and text would otherwise start the browser's own drag.
    onDragStart: (e: MouseEvent<HTMLDivElement>) => e.preventDefault(),
  };
}

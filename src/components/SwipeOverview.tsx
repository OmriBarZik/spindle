"use client";

import { clsx } from "clsx";
import { Fragment, type PointerEvent, useSyncExternalStore } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { clamp } from "@/lib/clamp";
import { directionSign } from "@/lib/directionSign";
import type { LiveSlot } from "@/lib/liveSlot";
import { type LineItem, slotLabel } from "@/lib/timeline";

/**
 * Earlier / Later, the overview bar of the whole line, and the screen-reader label.
 * Reads the live gap, so it keeps up with a finger on the strip without the game
 * re-rendering.
 */
export function SwipeOverview({
  items,
  choosing,
  live,
  onStep,
  onSlot,
}: {
  items: readonly LineItem[];
  choosing: boolean;
  live: LiveSlot;
  onStep: (delta: number) => void;
  onSlot: (slot: number) => void;
}) {
  const { t } = useI18n();
  const slot = useSyncExternalStore(live.subscribe, live.get, live.get) ?? 0;
  const count = items.length;

  /** Tapping the overview bar jumps to that part of the line. */
  function onMapDown(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const fromLeft = (e.clientX - r.left) / r.width;
    const along = directionSign(e.currentTarget) === 1 ? fromLeft : 1 - fromLeft;
    onSlot(Math.round(clamp(along, 0, 1) * count));
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onStep(-1)}
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
            <span className={clsx("swipe-map-gap", i === slot && "swipe-map-on")} />
            <span className={clsx("swipe-map-dot", !item.song && "swipe-map-anchor")} />
          </Fragment>
        ))}
        <span className={clsx("swipe-map-gap", slot === count && "swipe-map-on")} />
      </div>
      <button
        type="button"
        onClick={() => onStep(1)}
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
  );
}

"use client";

import { Fragment, type ReactNode } from "react";
import { SwipeBrowse } from "@/components/SwipeBrowse";
import { SwipeCard } from "@/components/SwipeCard";
import { SwipeGap } from "@/components/SwipeGap";
import { SwipeOverview } from "@/components/SwipeOverview";
import { useSwipeKeys } from "@/hooks/useSwipeKeys";
import { useSwipeTrack } from "@/hooks/useSwipeTrack";
import { useI18n } from "@/i18n/I18nProvider";
import { clamp } from "@/lib/clamp";
import { directionSign } from "@/lib/directionSign";
import type { LiveSlot } from "@/lib/liveSlot";
import { canAnimate } from "@/lib/motion";
import type { LineItem } from "@/lib/timeline";

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
/** A card plus its margins on a finished line: `.swipe-item` width + `.swipe-done .swipe-item` margins. */
const DONE_PITCH = 120;

export function SwipeLine({
  items,
  slot,
  onSlot,
  focus = 0,
  record,
  reveal = false,
  live,
  browse = false,
}: {
  items: readonly LineItem[];
  /** The gap under the record, or null when not placing. */
  slot: number | null;
  onSlot: (slot: number) => void;
  focus?: number;
  record?: ReactNode;
  /** The answer is showing beside the record: no glow, and the strip can't choose. */
  reveal?: boolean;
  /** The gap under the record as the strip moves (see `liveSlot.ts`). */
  live: LiveSlot;
  /** Once the game is over: Earlier / Later buttons that move the strip a card at a time. */
  browse?: boolean;
}) {
  const { t } = useI18n();
  const placing = slot !== null;
  const choosing = placing && !reveal;
  const count = items.length;
  const { trackRef, onScroll } = useSwipeTrack({ slot, count, focus, choosing, live, onSlot });

  function step(delta: number) {
    const from = live.get() ?? slot;
    if (from === null) {
      return;
    }
    const next = clamp(from + delta, 0, count);
    if (next !== from) {
      onSlot(next);
    }
  }

  /** Scroll the finished strip by `delta` cards (`DONE_PITCH`), in reading direction. */
  function browseBy(delta: number) {
    const track = trackRef.current;
    track?.scrollBy({
      left: delta * DONE_PITCH * directionSign(track),
      behavior: canAnimate() ? "smooth" : "auto",
    });
  }

  useSwipeKeys({ choosing, count, onStep: step, onSlot });

  const flank = (i: number) => choosing && (i === slot - 1 || i === slot);

  return (
    <div className="flex w-full flex-col gap-150">
      <div className={placing ? "swipe" : "swipe swipe-done"}>
        {/* Scrollable, so it must be reachable by keyboard. */}
        <div
          ref={trackRef}
          role="group"
          aria-label={t.common.lineLabel}
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- axe's scrollable-region-focusable needs it
          tabIndex={0}
          onScroll={onScroll}
          className="swipe-track"
        >
          <ol className="swipe-list">
            {items.map((item, i) => (
              <Fragment key={item.key}>
                {placing ? <SwipeGap slot={i} count={count} on={choosing && slot === i} /> : null}
                <SwipeCard item={item} index={i} lit={flank(i)} />
              </Fragment>
            ))}
            {placing ? (
              <SwipeGap slot={count} count={count} on={choosing && slot === count} />
            ) : null}
          </ol>
        </div>
        {record ? (
          <div className="swipe-record">
            {record}
            {choosing ? (
              <>
                <span aria-hidden className="swipe-drop" />
                <span aria-hidden className="swipe-pin">
                  ?
                </span>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {placing ? (
        <SwipeOverview
          items={items}
          choosing={choosing}
          live={live}
          onStep={step}
          onSlot={onSlot}
        />
      ) : null}
      {!placing && browse ? <SwipeBrowse onStep={browseBy} /> : null}
    </div>
  );
}

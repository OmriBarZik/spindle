"use client";

import { Fragment, type ReactNode } from "react";
import { SwipeCard } from "@/components/SwipeCard";
import { SwipeGap } from "@/components/SwipeGap";
import { SwipeOverview } from "@/components/SwipeOverview";
import { useSwipeKeys } from "@/hooks/useSwipeKeys";
import { useSwipeTrack } from "@/hooks/useSwipeTrack";
import { useI18n } from "@/i18n/I18nProvider";
import { clamp } from "@/lib/clamp";
import type { LiveSlot } from "@/lib/liveSlot";
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
export function SwipeLine({
  items,
  slot,
  onSlot,
  focus = 0,
  record,
  reveal = false,
  live,
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

  useSwipeKeys({ choosing, count, onStep: step, onSlot });

  const flank = (i: number) => choosing && (i === slot - 1 || i === slot);

  return (
    <div className="flex w-full flex-col gap-3">
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
    </div>
  );
}

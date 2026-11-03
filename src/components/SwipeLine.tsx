"use client";

import { Fragment, type ReactNode } from "react";
import { SwipeBrowse } from "@/components/SwipeBrowse";
import { SwipeGap } from "@/components/SwipeGap";
import { SwipeOverview } from "@/components/SwipeOverview";
import { SwipeStack } from "@/components/SwipeStack";
import { useStackedLine } from "@/hooks/useStackedLine";
import { useSwipeDrag } from "@/hooks/useSwipeDrag";
import { useSwipeKeys } from "@/hooks/useSwipeKeys";
import { useSwipeTrack } from "@/hooks/useSwipeTrack";
import { useSwipeWheel } from "@/hooks/useSwipeWheel";
import { useI18n } from "@/i18n/I18nProvider";
import { directionSign } from "@/lib/directionSign";
import type { LiveSlot } from "@/lib/liveSlot";
import { canAnimate } from "@/lib/motion";
import { stackFront } from "@/lib/stacks";
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
 *
 * Songs from the same year share one stack (`stacks.ts`), so the strip counts in
 * gaps between stacks; `slot`, `focus`, `onSlot` and `live` stay in card slots.
 */
/**
 * A card plus its margins on a finished line on a phone (`.swipe-item` width +
 * `.swipe-done .swipe-item` margins). `donePitch` measures the real one.
 */
const DONE_PITCH = 120;

/** The distance between two cards on a finished line, as laid out now. */
function donePitch(track: HTMLElement): number {
  const [a, b] = track.querySelectorAll<HTMLElement>(".swipe-item");
  return a && b ? Math.abs(b.offsetLeft - a.offsetLeft) : DONE_PITCH;
}

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
  const { stacks, sizes, gap, focusStack, gapLive, onGap, step, faces } = useStackedLine({
    items,
    slot,
    focus,
    live,
    onSlot,
  });
  const count = stacks.length;
  const { trackRef, pitchRef, onScroll, takeOver } = useSwipeTrack({
    slot: gap,
    count,
    focus: focusStack,
    choosing,
    live: gapLive,
    onSlot: onGap,
  });

  /** Scroll the finished strip by `delta` cards, in reading direction. */
  function browseBy(delta: number) {
    const track = trackRef.current;
    track?.scrollBy({
      left: delta * donePitch(track) * directionSign(track),
      behavior: canAnimate() ? "smooth" : "auto",
    });
  }

  useSwipeKeys({ choosing, count, onStep: step, onSlot: onGap });
  useSwipeWheel({
    trackRef,
    choosing,
    browse: !placing,
    slot: () => gapLive.get() ?? gap,
    count,
    onStep: step,
  });
  const drag = useSwipeDrag({ pitchRef, takeOver, choosing, count, onSlot: onGap });

  const flank = (i: number) => choosing && gap !== null && (i === gap - 1 || i === gap);

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
          {...drag}
          className="swipe-track"
        >
          <ol className="swipe-list">
            {stacks.map((stack, i) => (
              <Fragment key={stack.map((item) => item.key).join(" ")}>
                {placing ? <SwipeGap slot={i} count={count} on={choosing && gap === i} /> : null}
                <SwipeStack
                  items={stack}
                  index={i}
                  lit={flank(i)}
                  front={stackFront(sizes, i, focus)}
                />
              </Fragment>
            ))}
            {placing ? (
              <SwipeGap slot={count} count={count} on={choosing && gap === count} />
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
        <div className="mx-auto w-full max-w-page">
          <SwipeOverview
            items={faces}
            choosing={choosing}
            live={gapLive}
            onStep={step}
            onSlot={onGap}
          />
        </div>
      ) : null}
      {!placing && browse ? <SwipeBrowse onStep={browseBy} /> : null}
    </div>
  );
}

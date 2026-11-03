"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { SwipeCard } from "@/components/swipe/card/SwipeCard";
import { SwipeCardFace } from "@/components/swipe/card/SwipeCardFace";
import { SwipeRailSpot } from "@/components/swipe/SwipeRailSpot";
import { useI18n } from "@/i18n/I18nProvider";
import type { LineItem } from "@/lib/line/timeline";

/** How far behind the front card a card sits, for its offset (deeper ones share the last). */
function behind(depth: number): string {
  if (depth === 0) {
    return "";
  }
  return depth === 1 ? "swipe-behind-1" : "swipe-behind-2";
}

/** The rail spot takes the starting year's colour, else the front card's. */
function spotClass(items: readonly LineItem[], shown: LineItem | undefined): string | false {
  if (items.some((i) => !i.song)) {
    return "swipe-stack-anchor";
  }
  return shown?.variant === "good" || shown?.variant === "bad"
    ? `swipe-stack-${shown.variant}`
    : false;
}

/**
 * One stop on the line: a card, or songs from the same year stacked as one pile of
 * cards on one spot of the rail. The
 * front card reads like any other; the cards behind peek out above it, and the button
 * in its corner brings the next one to the front.
 */
export function SwipeStack({
  items,
  index,
  lit,
  front,
}: {
  items: readonly LineItem[];
  index: number;
  lit: boolean;
  /** The card shown first (the song just placed, when it's in this stack). */
  front: number;
}) {
  const { t } = useI18n();
  const [top, setTop] = useState(front);
  const n = items.length;
  if (n === 1 && items[0]) {
    return <SwipeCard item={items[0]} index={index} lit={lit} />;
  }
  const year = items[0]?.year ?? 0;
  // Back to front, so the front card is painted last, on top.
  const layers = items
    .map((item, i) => ({ item, depth: (i - top + n) % n }))
    .toSorted((a, b) => b.depth - a.depth);

  return (
    <li className={clsx("swipe-item", lit && "swipe-lit")} data-item={index}>
      <div className={clsx("swipe-stack", spotClass(items, items[top]))}>
        {layers.map(({ item, depth }) => (
          // The cards behind are out of reach until brought to the front.
          <div key={item.key} className="swipe-stack-layer" inert={depth > 0}>
            <SwipeCardFace item={item} className={behind(depth)} />
          </div>
        ))}
        <button
          type="button"
          className="swipe-stack-next"
          aria-label={t.common.stackNext(top + 1, n, year)}
          onClick={() => setTop((top + 1) % n)}
        >
          {top + 1}/{n}
        </button>
      </div>
      <SwipeRailSpot year={year} />
    </li>
  );
}

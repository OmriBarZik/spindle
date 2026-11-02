"use client";

import { clsx } from "clsx";
import { SwipeCardNames } from "@/components/SwipeCardNames";
import { useI18n } from "@/i18n/I18nProvider";
import type { LineItem } from "@/lib/timeline";

export function SwipeCard({ item, index, lit }: { item: LineItem; index: number; lit: boolean }) {
  const { t } = useI18n();
  const variant = item.song
    ? { plain: "", good: "card-good", bad: "card-bad" }[item.variant ?? "plain"]
    : "card-anchor";
  return (
    <li className={clsx("swipe-item", lit && "swipe-lit")} data-item={index}>
      <div className={clsx("card swipe-card", variant)}>
        <span className="text-2xl leading-none font-black tabular-nums">{item.year}</span>
        {item.song ? (
          <SwipeCardNames song={item.song} />
        ) : (
          <span className="text-sm text-muted">{t.common.startingYear}</span>
        )}
        {item.note ? <span className="swipe-note text-xs font-semibold">{item.note}</span> : null}
      </div>
      {/* The card's spot on the time rail. */}
      <span aria-hidden className="swipe-stem" />
      <span aria-hidden className="swipe-node" />
      <span aria-hidden className="swipe-year">
        {item.year}
      </span>
    </li>
  );
}

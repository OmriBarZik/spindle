"use client";

import { clsx } from "clsx";
import { SwipeCardNames } from "@/components/SwipeCardNames";
import { useI18n } from "@/i18n/I18nProvider";
import type { LineItem } from "@/lib/timeline";

/** The class that colours a card: answered right or wrong, or the starting year. */
function cardVariant(item: LineItem): string {
  return item.song
    ? { plain: "", good: "card-good", bad: "card-bad" }[item.variant ?? "plain"]
    : "card-anchor";
}

/** A card's face: its year and song (or "Starting year"), and any note. */
export function SwipeCardFace({ item, className }: { item: LineItem; className?: string }) {
  const { t } = useI18n();
  return (
    <div className={clsx("card swipe-card", cardVariant(item), className)}>
      <span className="text-2xl leading-none font-black tabular-nums lg:text-3xl">{item.year}</span>
      {item.song ? (
        <SwipeCardNames song={item.song} />
      ) : (
        <span className="text-sm text-muted lg:text-base">{t.common.startingYear}</span>
      )}
      {item.note ? <span className="swipe-note text-xs font-semibold">{item.note}</span> : null}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { slotLabel } from "@/lib/timeline";

/**
 * Text for screen readers only, read out when it changes (e.g. "Correct!").
 * Always mounted, since a live region added together with its text is often missed.
 * It's absolutely positioned, so it takes no space in flex or grid layouts.
 */
export function Announce({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  );
}

/**
 * Answers with the gap under the record. It says where the song goes ("Between
 * 1992 and 1997"); its accessible name adds the action ("Place it: …").
 */
export function PlaceButton({
  cards,
  slot,
  disabled = false,
  onPlace,
}: {
  cards: readonly { year: number }[];
  slot: number;
  disabled?: boolean;
  onPlace: (slot: number) => void;
}) {
  const { t } = useI18n();
  const where = slotLabel(cards, slot, t.placeAt);
  return (
    <button
      type="button"
      className="btn-primary"
      disabled={disabled}
      aria-label={t.common.placeIt(where)}
      onClick={() => onPlace(slot)}
    >
      {where}
    </button>
  );
}

/** The end-of-day box with the result, stats and share button. */
export function ResultCard({ children }: { children: ReactNode }) {
  return (
    <section className="card flex flex-col items-center gap-4 p-5 text-center">{children}</section>
  );
}

export function Stats({ items }: { items: [label: string, value: number][] }) {
  return (
    <dl className="grid w-full grid-cols-4 gap-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[11px] tracking-wider text-muted uppercase">{label}</dt>
          <dd className="text-xl font-bold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

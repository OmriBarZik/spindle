"use client";

import { clsx } from "clsx";
import { useI18n } from "@/i18n/I18nProvider";
import type { SortDay } from "@/lib/saveData";

function dotColor(state: SortDay, i: number): string {
  const turn = state.placements.length;
  if (i < turn) {
    return state.placements[i]?.correct ? "bg-success-bright" : "bg-danger";
  }
  return i === turn ? "bg-primary" : "bg-tertiary";
}

/** The title, the day's starting year and one progress dot per song. */
export function SortHeader({ state }: { state: SortDay }) {
  const { t } = useI18n();
  const total = state.songIds.length;
  return (
    <section className="text-center">
      <h1 className="text-2xl font-bold">{t.sort.name}</h1>
      <p className="mx-auto mt-50 max-w-page text-sm text-muted">
        {t.sort.intro(state.anchorYear)}
      </p>
      <div
        className="mt-150 flex justify-center gap-100"
        role="img"
        aria-label={t.sort.progress(Math.min(state.placements.length + 1, total), total)}
      >
        {state.songIds.map((id, i) => (
          <span key={id} className={clsx("h-100 w-400 rounded-full", dotColor(state, i))} />
        ))}
      </div>
    </section>
  );
}

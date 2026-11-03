"use client";

import { useI18n } from "@/i18n/I18nProvider";

export function TimelineHeader({
  pending,
  firstDayYear,
  dayNumber,
  best,
}: {
  pending: boolean;
  /** The starting year, on the first day of a new timeline. */
  firstDayYear: number | null;
  dayNumber: number;
  best: number;
}) {
  const { t } = useI18n();

  function intro() {
    if (firstDayYear !== null) {
      return t.timeline.introFirst(firstDayYear);
    }
    return pending ? t.timeline.introPending : t.timeline.introDone;
  }

  return (
    <section className="text-center">
      <h1 className="text-2xl font-bold">{t.timeline.name}</h1>
      <p className="mx-auto mt-50 max-w-page text-sm text-muted">{intro()}</p>
      <p className="mt-100 text-xs tracking-wider text-muted uppercase rtl:tracking-normal">
        {t.timeline.dayLine(dayNumber, best)}
      </p>
    </section>
  );
}

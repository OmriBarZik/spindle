"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { dayKey } from "@/lib/dates";
import { loadSave } from "@/lib/storage";
import { dayDate, weekDays } from "@/lib/week";

/**
 * The home page's "This week": one bar per day, lit when the player played that day.
 * Client-only (`WeekStripClient`), since it reads the save and today's date.
 */
export function WeekStrip() {
  const { lang, t } = useI18n();
  const [data] = useState(loadSave);
  const [today] = useState(dayKey);
  const days = weekDays(data, today);
  const weekday = new Intl.DateTimeFormat(lang, { weekday: "narrow" });
  const longDay = new Intl.DateTimeFormat(lang, { weekday: "long" });
  const count = days.filter((d) => d.played).length;

  return (
    <section aria-labelledby="week-heading" className="card week-card">
      <div className="flex items-baseline justify-between gap-150 text-sm">
        <h2 id="week-heading" className="font-bold">
          {t.home.weekHeading}
        </h2>
        <span className="text-muted">{t.home.weekCount(count)}</span>
      </div>
      <ol className="grid grid-cols-7 gap-100 text-center font-mono text-xs text-muted">
        {days.map(({ day, played, future }) => (
          <li
            key={day}
            className={clsx("flex flex-col items-center gap-50", day === today && "text-ink")}
          >
            <span
              aria-hidden
              className={clsx(
                "week-bar",
                played && "week-bar-on",
                day === today && "week-bar-today",
                future && "week-bar-future",
              )}
            />
            <span aria-hidden>{weekday.format(dayDate(day))}</span>
            <span className="sr-only">{t.home.weekDay(longDay.format(dayDate(day)), played)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

"use client";

import { Hearts } from "@/components/Hearts";
import { useI18n } from "@/i18n/I18nProvider";
import { MARATHON_HEARTS } from "@/lib/marathonState";

/** The title, the day's starting year, the hearts left and the score so far. */
export function MarathonHeader({
  anchorYear,
  hearts,
  hits,
}: {
  anchorYear: number;
  hearts: number;
  hits: number;
}) {
  const { t } = useI18n();
  return (
    <section className="text-center">
      <h1 className="text-2xl font-bold">{t.marathon.name}</h1>
      <p className="mt-1 text-sm text-muted">{t.marathon.intro(anchorYear)}</p>
      <div className="mt-3 flex items-center justify-center gap-4">
        <Hearts
          left={hearts}
          total={MARATHON_HEARTS}
          label={t.marathon.hearts(hearts, MARATHON_HEARTS)}
        />
        <span className="font-mono text-sm font-bold tabular-nums">{t.marathon.score(hits)}</span>
      </div>
    </section>
  );
}

"use client";

import { Hearts } from "@/components/Hearts";
import { useI18n } from "@/i18n/I18nProvider";
import { MARATHON_HEARTS } from "@/lib/marathonState";

/**
 * The title, the run's starting year, the hearts left and the score so far. A free-play run
 * says it isn't the daily marathon.
 */
export function MarathonHeader({
  anchorYear,
  hearts,
  hits,
  free,
}: {
  anchorYear: number;
  hearts: number;
  hits: number;
  free: boolean;
}) {
  const { t } = useI18n();
  return (
    <section className="text-center">
      <h1 className="text-2xl font-bold">{t.marathon.name}</h1>
      <p className="mx-auto mt-50 max-w-page text-sm text-muted">
        {free ? t.marathon.freeIntro(anchorYear) : t.marathon.intro(anchorYear)}
      </p>
      <div className="mt-150 flex items-center justify-center gap-200">
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

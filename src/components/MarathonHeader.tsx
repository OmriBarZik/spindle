"use client";

import { Hearts } from "@/components/Hearts";
import { useI18n } from "@/i18n/I18nProvider";
import type { Messages } from "@/i18n/messages";
import { MARATHON_HEARTS } from "@/lib/marathonState";
import type { MarathonDay, MarathonFreeRun } from "@/lib/saveData";

function intro(t: Messages, run: MarathonDay | MarathonFreeRun) {
  if (!("seed" in run)) {
    return t.marathon.intro(run.anchorYear);
  }
  return run.shared
    ? t.marathon.challengeIntro(run.anchorYear)
    : t.marathon.freeIntro(run.anchorYear);
}

/**
 * The title, the run's starting year, the hearts left and the score so far. A free-play run
 * says it isn't the daily marathon, and a friend's run says where it came from.
 */
export function MarathonHeader({
  run,
  hearts,
  hits,
}: {
  run: MarathonDay | MarathonFreeRun;
  hearts: number;
  hits: number;
}) {
  const { t } = useI18n();
  return (
    <section className="text-center">
      <h1 className="text-2xl font-bold">{t.marathon.name}</h1>
      <p className="mx-auto mt-50 max-w-page text-sm text-muted">{intro(t, run)}</p>
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

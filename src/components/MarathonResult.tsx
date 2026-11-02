"use client";

import { ResultCard } from "@/components/ResultCard";
import { ShareButton } from "@/components/ShareButton";
import { Stats } from "@/components/Stats";
import { useI18n } from "@/i18n/I18nProvider";
import type { MarathonDay, MarathonStats } from "@/lib/saveData";
import { marathonShareText } from "@/lib/share";

/** The finished day: final score, stats and share. */
export function MarathonResult({
  day,
  state,
  stats,
  title,
  score,
  hits,
}: {
  day: string;
  state: MarathonDay;
  stats: MarathonStats;
  title: string;
  score: string;
  hits: number;
}) {
  const { t } = useI18n();
  const average = stats.played > 0 ? Math.round(stats.totalHits / stats.played) : 0;
  return (
    <ResultCard>
      <div className="text-2xl font-bold">{title}</div>
      <div className="text-lg">{score}</div>
      <Stats
        items={[
          [t.marathon.stats.today, hits],
          [t.marathon.stats.best, stats.best],
          [t.marathon.stats.played, stats.played],
          [t.marathon.stats.average, average],
        ]}
      />
      <ShareButton
        mode="marathon"
        text={marathonShareText(t, day, state, window.location.origin)}
      />
      <p className="text-sm text-muted">{t.marathon.tomorrow}</p>
    </ResultCard>
  );
}

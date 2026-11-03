"use client";

import { ResultCard } from "@/components/result/ResultCard";
import { ShareButton } from "@/components/result/ShareButton";
import { Stats } from "@/components/result/Stats";
import { useI18n } from "@/i18n/I18nProvider";
import { sortEmoji, sortShareText } from "@/lib/games/share";
import type { SortDay, SortStats } from "@/lib/save/saveData";

/** The finished day: score, stats and share. */
export function SortResult({
  state,
  stats,
  score,
}: {
  state: SortDay;
  stats: SortStats;
  score: string;
}) {
  const { t } = useI18n();
  return (
    <ResultCard>
      <div className="text-3xl font-bold">{score}</div>
      {/* The score above says the same for screen readers. */}
      <div dir="ltr" aria-hidden className="text-2xl tracking-wider">
        {sortEmoji(state)}
      </div>
      <Stats
        items={[
          [t.sort.stats.played, stats.played],
          [t.sort.stats.perfect, stats.perfect],
          [t.sort.stats.streak, stats.streak],
          [t.sort.stats.bestStreak, stats.maxStreak],
        ]}
      />
      <ShareButton mode="daily_five" text={sortShareText(t, state, window.location.origin)} />
      <p className="text-sm text-muted">{t.sort.tomorrow}</p>
    </ResultCard>
  );
}

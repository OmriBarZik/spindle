"use client";

import { ResultCard } from "@/components/ResultCard";
import { ShareButton } from "@/components/ShareButton";
import { Stats } from "@/components/Stats";
import { useI18n } from "@/i18n/I18nProvider";
import type { Messages } from "@/i18n/messages";
import type { MarathonDay, MarathonFreeRun, MarathonStats } from "@/lib/saveData";
import { marathonShareText } from "@/lib/share";

function statItems(
  t: Messages,
  stats: MarathonStats,
  hits: number,
  daily: number | null,
): [string, number][] {
  if (daily !== null) {
    // Free play: this run beside the day's real score; it never changes the stats.
    return [
      [t.marathon.stats.run, hits],
      [t.marathon.stats.today, daily],
      [t.marathon.stats.best, stats.best],
      [t.marathon.stats.played, stats.played],
    ];
  }
  const average = stats.played > 0 ? Math.round(stats.totalHits / stats.played) : 0;
  return [
    [t.marathon.stats.today, hits],
    [t.marathon.stats.best, stats.best],
    [t.marathon.stats.played, stats.played],
    [t.marathon.stats.average, average],
  ];
}

/**
 * The finished run: final score, stats, share and "Play again". `daily` is the day's score
 * when this was a free-play run, else null.
 */
export function MarathonResult({
  day,
  state,
  stats,
  title,
  score,
  hits,
  daily,
  onPlayAgain,
}: {
  day: string;
  state: MarathonDay | MarathonFreeRun;
  stats: MarathonStats;
  title: string;
  score: string;
  hits: number;
  daily: number | null;
  onPlayAgain: () => void;
}) {
  const { t } = useI18n();
  const free = daily !== null;
  return (
    <ResultCard>
      <div className="text-2xl font-bold">{title}</div>
      <div className="text-lg">{score}</div>
      <Stats items={statItems(t, stats, hits, daily)} />
      <ShareButton
        mode="marathon"
        text={marathonShareText(t, day, state, window.location.origin)}
        label={free ? t.marathon.shareFree : undefined}
      />
      <button
        type="button"
        onClick={onPlayAgain}
        className="w-full rounded-full border border-line px-250 py-150 font-bold transition hover:bg-hover"
      >
        {t.marathon.playAgain}
      </button>
      <p className="text-sm text-muted">{free ? t.marathon.freeNote : t.marathon.tomorrow}</p>
    </ResultCard>
  );
}

"use client";

import { ResultCard } from "@/components/ResultCard";
import { ShareButton } from "@/components/ShareButton";
import { Stats } from "@/components/Stats";
import { useI18n } from "@/i18n/I18nProvider";
import type { Messages } from "@/i18n/messages";
import type { MarathonRun } from "@/lib/marathonFree";
import type { MarathonStats } from "@/lib/saveData";
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

const secondary =
  "w-full rounded-full border border-line px-250 py-150 font-bold transition hover:bg-hover";

/**
 * The finished run: final score, stats, share and "Play again". After a friend's run opened
 * before the day's, the second button goes to the day's run instead.
 */
export function MarathonResult({
  run: { state, daily, dailyDone },
  stats,
  title,
  score,
  hits,
  onPlayAgain,
  onPlayDaily,
}: {
  run: MarathonRun;
  stats: MarathonStats;
  title: string;
  score: string;
  hits: number;
  onPlayAgain: () => void;
  onPlayDaily: () => void;
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
        text={marathonShareText(t, state, window.location.origin)}
        label={free ? t.marathon.shareFree : undefined}
      />
      {dailyDone ? (
        <button type="button" onClick={onPlayAgain} className={secondary}>
          {t.marathon.playAgain}
        </button>
      ) : (
        <button type="button" onClick={onPlayDaily} className={secondary}>
          {t.marathon.playDaily}
        </button>
      )}
      <p className="text-sm text-muted">{free ? t.marathon.freeNote : t.marathon.tomorrow}</p>
    </ResultCard>
  );
}

"use client";

import type { ReactNode } from "react";
import { ResultCard } from "@/components/ResultCard";
import { ShareButton } from "@/components/ShareButton";
import { Stats } from "@/components/Stats";
import { useI18n } from "@/i18n/I18nProvider";
import type { SaveData } from "@/lib/saveData";
import { timelineShareText } from "@/lib/share";
import { songCount } from "@/lib/timeline";

/** Today's answered turn: what happened, stats and share. */
export function TimelineResult({
  title,
  text,
  wrong,
  dayNumber,
  data,
}: {
  title: ReactNode;
  text: ReactNode;
  wrong: boolean;
  dayNumber: number;
  data: SaveData;
}) {
  const { t } = useI18n();
  const { timeline, settings } = data;
  const songs = songCount(timeline.cards);
  return (
    <ResultCard>
      <div className="text-2xl font-bold">{title}</div>
      <p className="text-sm text-muted">{text}</p>
      <Stats
        items={[
          [t.timeline.stats.songs, songs],
          [t.timeline.stats.best, timeline.best],
          [t.timeline.stats.runs, timeline.runs + 1],
          [t.timeline.stats.day, dayNumber],
        ]}
      />
      <ShareButton
        mode="timeline"
        text={timelineShareText(
          t,
          { songs, wrong, langs: settings.songLanguages },
          window.location.origin,
        )}
      />
    </ResultCard>
  );
}

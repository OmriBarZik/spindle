"use client";

import { SortFeedback } from "@/components/sort/SortFeedback";
import { useI18n } from "@/i18n/I18nProvider";
import type { Song } from "@/lib/catalog/songs";

/** How the last placement went, which song it was, and the heart it cost if wrong. */
export function MarathonFeedback({ song, correct }: { song: Song; correct: boolean }) {
  const { t } = useI18n();
  return (
    <>
      <SortFeedback song={song} correct={correct} />
      {correct ? null : ` ${t.marathon.lostHeart}`}
    </>
  );
}

"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { type Song, songNames } from "@/lib/songs";

/** How the last placement went, and which song it was. */
export function SortFeedback({ song, correct }: { song: Song; correct: boolean }) {
  const { lang, t } = useI18n();
  const { title, artist } = songNames(song, lang);
  return (
    <>
      {correct ? t.sort.correct : t.sort.wrong} {t.sort.reveal(title, artist, song.year)}
    </>
  );
}

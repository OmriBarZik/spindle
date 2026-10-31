"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { songNames } from "@/lib/songs";

export default function SongReveal(song: { title: string; artist: string; youtubeId: string }) {
  const { lang, t } = useI18n();
  const { title, artist } = songNames(song, lang);
  const { youtubeId } = song;
  return (
    <div className="min-w-0">
      {/* Titles and artists are mostly Latin; <bdi> keeps them intact in RTL pages. */}
      <div className="truncate font-semibold">
        <bdi>{title}</bdi>
      </div>
      <div className="truncate text-sm text-muted">
        <bdi>{artist}</bdi> ·{" "}
        <a
          href={`https://www.youtube.com/watch?v=${youtubeId}`}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-dotted underline-offset-2 hover:text-white"
        >
          {t.common.watch}
        </a>
      </div>
    </div>
  );
}

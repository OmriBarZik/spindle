"use client";

import { ExternalLink } from "@/components/ExternalLink";
import { useI18n } from "@/i18n/I18nProvider";
import { getSong, songNames, type SongRef } from "@/lib/songs";

export function SwipeCardNames({ song }: { song: SongRef }) {
  const { lang, t } = useI18n();
  const { title, artist } = songNames(song, lang);
  // Saved cards may still hold a video that has since been replaced; link the current one.
  const youtubeId = getSong(song.youtubeId)?.youtubeId ?? song.youtubeId;
  return (
    <>
      {/* Titles and artists are mostly Latin; <bdi> keeps them intact in RTL pages. */}
      <span className="line-clamp-2 text-sm leading-snug font-bold">
        <bdi>{title}</bdi>
      </span>
      <span className="truncate text-xs text-muted">
        <bdi>{artist}</bdi>
      </span>
      <ExternalLink
        href={`https://www.youtube.com/watch?v=${youtubeId}`}
        className="mt-auto text-xs text-muted underline decoration-dotted underline-offset-2 hover:text-white"
      >
        {t.common.watch}
      </ExternalLink>
    </>
  );
}

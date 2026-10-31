"use client";

import ExternalLink from "@/components/ExternalLink";
import { useI18n } from "@/i18n/I18nProvider";
import { getSong, songNames } from "@/lib/songs";

export default function SongReveal(song: { title: string; artist: string; youtubeId: string }) {
  const { lang, t } = useI18n();
  const { title, artist } = songNames(song, lang);
  // Saved cards may still hold a video that has since been replaced; link the current one.
  const youtubeId = getSong(song.youtubeId)?.youtubeId ?? song.youtubeId;
  return (
    <div className="min-w-0">
      {/* Titles and artists are mostly Latin; <bdi> keeps them intact in RTL pages. */}
      <div className="truncate font-semibold">
        <bdi>{title}</bdi>
      </div>
      <div className="truncate text-sm text-muted">
        <bdi>{artist}</bdi> ·{" "}
        <ExternalLink
          href={`https://www.youtube.com/watch?v=${youtubeId}`}
          className="underline decoration-dotted underline-offset-2 hover:text-white"
        >
          {t.common.watch}
        </ExternalLink>
      </div>
    </div>
  );
}

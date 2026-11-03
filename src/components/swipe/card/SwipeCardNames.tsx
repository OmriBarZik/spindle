"use client";

import { ExternalLink } from "@/components/site/ExternalLink";
import { useI18n } from "@/i18n/I18nProvider";
import { getSong, songNames, type SongRef } from "@/lib/catalog/songs";

export function SwipeCardNames({ song }: { song: SongRef }) {
  const { lang, t } = useI18n();
  const { title, artist } = songNames(song, lang);
  // Saved cards may still hold a video that has since been replaced; link the current one.
  const youtubeId = getSong(song.youtubeId)?.youtubeId ?? song.youtubeId;
  return (
    <>
      {/* Each name runs in its own direction (dir="auto"), so a long English name is cut
          at its end even on a Hebrew page; `.swipe-name` keeps it on the page's side. */}
      <span
        dir="auto"
        className="swipe-name swipe-title line-clamp-2 text-sm font-bold lg:text-base"
      >
        {title}
      </span>
      <span dir="auto" className="swipe-name truncate text-xs text-muted lg:text-sm">
        {artist}
      </span>
      <ExternalLink
        href={`https://www.youtube.com/watch?v=${youtubeId}`}
        className="mt-auto text-xs text-muted underline decoration-dotted underline-offset-2 hover:text-ink"
      >
        {t.common.watch}
      </ExternalLink>
    </>
  );
}

"use client";

import { clsx } from "clsx";
import { ExternalLink } from "@/components/ExternalLink";
import { useI18n } from "@/i18n/I18nProvider";
import type { MarathonDay } from "@/lib/saveData";
import { getSong, songNames } from "@/lib/songs";

/**
 * Every song of a finished Marathon, in the order it was played, each with a link to
 * it on YouTube (songs are only revealed once the day is over).
 */
export function MarathonSongList({ state }: { state: MarathonDay }) {
  const { lang, t } = useI18n();
  const songs = state.placements.flatMap((p) => {
    const song = getSong(p.songId);
    return song ? [{ song, correct: p.correct }] : [];
  });
  return (
    <section aria-labelledby="run-songs" className="card p-4">
      <h2 id="run-songs" className="px-1 text-lg font-bold">
        {t.marathon.songsHeading}
      </h2>
      <ol className="mt-2 flex flex-col">
        {songs.map(({ song, correct }, i) => {
          const { title, artist } = songNames(song, lang);
          return (
            <li
              key={song.id}
              className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0"
            >
              <span
                aria-hidden
                className={clsx("run-mark", correct ? "run-mark-good" : "run-mark-bad")}
              >
                {i + 1}
              </span>
              <span className="sr-only">
                {correct ? t.marathon.placedRight : t.marathon.placedWrong}
              </span>
              <span className="flex min-w-0 grow flex-col">
                <span className="truncate text-sm font-bold">
                  <bdi>{title}</bdi>
                </span>
                <span className="truncate text-xs text-muted">
                  <bdi>{artist}</bdi> · {song.year}
                </span>
              </span>
              <ExternalLink
                href={`https://www.youtube.com/watch?v=${song.youtubeId}`}
                className="run-link"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {/* The visible word is in the spoken name too ("Watch … on YouTube"). */}
                <span aria-hidden>{t.common.watch}</span>
                <span className="sr-only">{t.marathon.openOnYouTube(title)}</span>
              </ExternalLink>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

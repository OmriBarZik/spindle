import songsData from "@/data/songs.json";
import type { Locale } from "@/i18n/config";

export type Song = {
  id: string;
  title: string;
  artist: string;
  year: number;
  youtubeId: string;
  /** Optional offset (seconds) to skip a long intro. */
  start?: number;
  /** Names in Hebrew script, shown on Hebrew pages (for Israeli songs). */
  titleHe?: string;
  artistHe?: string;
};

type RawSong = Omit<Song, "id">;

export const SONGS: Song[] = (songsData as RawSong[]).map((s) => ({
  ...s,
  id: s.youtubeId,
}));

/**
 * Which pool a song belongs to, for the player's song settings. Israeli songs (the ones
 * with Hebrew names) are "he"; everything else is "en". A few Israeli entries are sung
 * in English, so the UI calls these "Israeli" and "International" songs.
 */
export type SongLanguage = "en" | "he";
export const SONG_LANGUAGES: readonly SongLanguage[] = ["en", "he"];

export function songLanguage(song: Pick<Song, "titleHe">): SongLanguage {
  return song.titleHe ? "he" : "en";
}

export const SONG_BY_ID = new Map(SONGS.map((s) => [s.id, s]));

export function getSong(id: string): Song | undefined {
  return SONG_BY_ID.get(id);
}

/**
 * Title and artist to show in a language. Looks the song up by `youtubeId`, because
 * timeline cards saved in localStorage only carry the English names.
 */
export function songNames(
  song: { title: string; artist: string; youtubeId: string },
  lang: Locale,
): { title: string; artist: string } {
  const full = getSong(song.youtubeId);
  if (lang === "he" && full) {
    return { title: full.titleHe ?? song.title, artist: full.artistHe ?? song.artist };
  }
  return { title: song.title, artist: song.artist };
}

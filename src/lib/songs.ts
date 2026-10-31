import songsData from "@/data/songs.json";
import type { Locale } from "@/i18n/config";

export type Song = {
  /**
   * Stable song id, stored in saves. It is the song's first `youtubeId`; when the video
   * is later swapped (e.g. for an audio-only upload), songs.json keeps the old one as `id`.
   */
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

type RawSong = Omit<Song, "id"> & { id?: string };

// Runs once at load; a fresh object per song keeps the JSON module untouched.
// oxlint-disable-next-line oxc/no-map-spread
export const SONGS: Song[] = (songsData as RawSong[]).map((s) => ({
  ...s,
  id: s.id ?? s.youtubeId,
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
const SONG_BY_VIDEO = new Map(SONGS.map((s) => [s.youtubeId, s]));

/** Finds a song by its stable id, or by its current `youtubeId`. */
export function getSong(id: string | undefined): Song | undefined {
  return id === undefined ? undefined : (SONG_BY_ID.get(id) ?? SONG_BY_VIDEO.get(id));
}

/**
 * Title and artist to show in a language. Looks the song up by `youtubeId`, because
 * timeline cards saved in localStorage only carry the English names. Older saved cards
 * hold the song's original video, which is also its stable id, so either one resolves.
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

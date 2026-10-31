import songsData from "@/data/songs.json";

export type Song = {
  id: string;
  title: string;
  artist: string;
  year: number;
  youtubeId: string;
  /** Optional offset (seconds) to skip a long intro. */
  start?: number;
};

type RawSong = Omit<Song, "id">;

export const SONGS: Song[] = (songsData as RawSong[]).map((s) => ({
  ...s,
  id: s.youtubeId,
}));

export const SONG_BY_ID = new Map(SONGS.map((s) => [s.id, s]));

export function getSong(id: string): Song | undefined {
  return SONG_BY_ID.get(id);
}

#!/usr/bin/env node
/**
 * Checks every song in src/data/songs.json against YouTube's oEmbed endpoint.
 * - Flags videos that are missing, private, or not embeddable.
 * - Prints the real YouTube title next to our title so mismatches are easy to spot.
 *
 * Usage: npm run validate-songs            (all songs)
 *        npm run validate-songs -- --quiet (only problems)
 *
 * Runs as TypeScript directly (Node strips the types).
 */
import { readFile } from "node:fs/promises";

type Song = { artist: string; title: string; youtubeId: string };
type OEmbed = { title: string; author_name: string };

const quiet = process.argv.includes("--quiet");
const songs = JSON.parse(
  await readFile(new URL("../src/data/songs.json", import.meta.url), "utf8"),
) as Song[];

const problems: { song: Song; reason: string }[] = [];
const CONCURRENCY = 8;
let index = 0;

const describe = (song: Song) => `${song.youtubeId}  ${song.artist} – ${song.title}`;

function failureReason(status: number): string {
  if (status === 401 || status === 403) return "embedding disabled";
  if (status === 404) return "not found / private";
  return `HTTP ${status}`;
}

async function check(song: Song): Promise<void> {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${song.youtubeId}`,
  )}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const reason = failureReason(res.status);
      problems.push({ song, reason });
      console.log(`❌ ${describe(song)}  (${reason})`);
      return;
    }
    const info = (await res.json()) as OEmbed;
    if (!quiet) console.log(`✅ ${describe(song)}\n      ↳ ${info.title}  [${info.author_name}]`);
  } catch (err) {
    problems.push({ song, reason: String(err) });
    console.log(`⚠️  ${describe(song)}  (${String(err)})`);
  }
}

// A small pool of workers, each checking one song at a time.
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let song = songs[index++]; song; song = songs[index++]) {
      // Sequential within a worker on purpose: CONCURRENCY limits parallel requests.
      // oxlint-disable-next-line no-await-in-loop
      await check(song);
    }
  }),
);

console.log(`\n${songs.length - problems.length}/${songs.length} songs OK.`);
if (problems.length > 0) process.exit(1);

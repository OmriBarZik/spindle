#!/usr/bin/env node
/**
 * Checks every song in src/data/songs.json against YouTube's oEmbed endpoint.
 * - Flags videos that are missing, private, or not embeddable.
 * - Prints the real YouTube title next to our title so mismatches are easy to spot.
 *
 * Usage: npm run validate-songs            (all songs)
 *        npm run validate-songs -- --quiet (only problems)
 */
import { readFile } from "node:fs/promises";

const quiet = process.argv.includes("--quiet");
const songs = JSON.parse(
  await readFile(new URL("../src/data/songs.json", import.meta.url), "utf8"),
);

const problems = [];
const CONCURRENCY = 8;
let index = 0;

async function check(song) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${song.youtubeId}`,
  )}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const reason =
        res.status === 401 || res.status === 403
          ? "embedding disabled"
          : res.status === 404
            ? "not found / private"
            : `HTTP ${res.status}`;
      problems.push({ song, reason });
      console.log(`❌ ${song.youtubeId}  ${song.artist} – ${song.title}  (${reason})`);
      return;
    }
    const info = await res.json();
    if (!quiet) {
      console.log(`✅ ${song.youtubeId}  ${song.artist} – ${song.title}\n      ↳ ${info.title}  [${info.author_name}]`);
    }
  } catch (err) {
    problems.push({ song, reason: String(err) });
    console.log(`⚠️  ${song.youtubeId}  ${song.artist} – ${song.title}  (${err})`);
  }
}

await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (index < songs.length) await check(songs[index++]);
  }),
);

console.log(`\n${songs.length - problems.length}/${songs.length} songs OK.`);
if (problems.length) process.exit(1);

import { expect, it } from "vitest";
import type { Locale } from "@/i18n/config";
import { anchorYearFor, sortSongsFor, timelineAnchorYearFor, timelineSongFor } from "@/lib/daily";
import { addDays } from "@/lib/dates";
import { hashString, mulberry32, seededShuffle } from "@/lib/random";

/**
 * Locks every player's past and future puzzles. If this snapshot changes, the seed
 * strings, the shuffle or the catalog order changed, and everyone's daily songs moved.
 * Only update it on purpose (e.g. after adding songs), never as part of a refactor.
 */

const settings: { name: string; langs: Locale[] }[] = [
  { name: "en+he", langs: ["en", "he"] },
  { name: "en", langs: ["en"] },
  { name: "he", langs: ["he"] },
];
const days = Array.from({ length: 30 }, (_, i) => addDays("2026-10-20", i));

it.for(settings)("daily picks are stable: for $name", ({ langs }) => {
  const picks = days.map((day) => {
    const five = sortSongsFor(day, langs);
    const timeline = timelineSongFor(day, new Set(), langs)!;
    return [
      day,
      five.map((s) => s.id).join(","),
      anchorYearFor(day, langs),
      timeline.id,
      timelineAnchorYearFor(day, timeline.year, langs),
    ].join(" ");
  });
  expect(picks).toMatchSnapshot();
});

it("random: hashes with FNV-1a", () => {
  expect(hashString("")).toBe(0x811c9dc5);
  expect(hashString("a")).toBe(0xe40c292c);
  expect(hashString("sort:2026-11-01")).toMatchSnapshot();
});

it("random: is a deterministic PRNG in [0, 1)", () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  const seq = Array.from({ length: 5 }, () => a());
  expect(seq).toEqual(Array.from({ length: 5 }, () => b()));
  for (const x of seq) {
    expect(x >= 0 && x < 1).toBe(true);
  }
  expect(seq).toMatchSnapshot();
});

it("random: shuffles without losing or changing items", () => {
  const items = Array.from({ length: 20 }, (_, i) => i);
  const out = seededShuffle(items, "seed");
  expect(out).not.toBe(items);
  expect(out.toSorted((x, y) => x - y)).toEqual(items);
  expect(seededShuffle(items, "seed")).toEqual(out);
  expect(out).toMatchSnapshot();
});

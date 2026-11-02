import { expect, it } from "vitest";
import { sortSongsFor, timelineSongFor } from "@/lib/daily";
import { addDays } from "@/lib/dates";
import type { SaveData } from "@/lib/saveData";
import { getSong } from "@/lib/songs";
import { emptySave, setSongLanguage } from "@/lib/storage";
import { correctSlot, isSlotCorrect, songCount } from "@/lib/timeline";
import { ensureTimelineDay, placeTimelineCard, skipTimelineSong } from "@/lib/timelineState";

// Daily Timeline is a hidden page now (see CLAUDE.md), but its rules still hold.

const DAY = "2026-11-01";
const he = (id: string) => Boolean(getSong(id)?.titleHe);

it("daily selection: timeline song avoids today's sort songs and excluded ids", () => {
  const sortIds = new Set(sortSongsFor(DAY).map((s) => s.id));
  const first = timelineSongFor(DAY, new Set())!;
  expect(sortIds.has(first.id)).toBe(false);
  const second = timelineSongFor(DAY, new Set([first.id]))!;
  expect(second.id).not.toBe(first.id);
});

function playCorrect(d: SaveData, day: string): SaveData {
  d = ensureTimelineDay(d, day);
  const song = getSong(d.timeline.today!.songId)!;
  return placeTimelineCard(d, day, correctSlot(d.timeline.cards, song.year));
}

it("timeline mode: starts a new timeline with a free starting year to guess against", () => {
  const d = ensureTimelineDay(emptySave(), DAY);
  const song = getSong(d.timeline.today!.songId)!;
  expect(d.timeline.cards).toHaveLength(1);
  expect(d.timeline.cards[0]!.anchor).toBe(true);
  expect(d.timeline.cards[0]!.year).not.toBe(song.year);
  expect(d.timeline.today!.result).toBe("pending");
});

it("timeline mode: counts day 1 as a real guess", () => {
  const d = playCorrect(emptySave(), DAY);
  expect(d.timeline.today!.result).toBe("correct");
  expect(songCount(d.timeline.cards)).toBe(1);
  expect(d.timeline.best).toBe(1);
});

it("timeline mode: grows the timeline on consecutive correct days", () => {
  let d = emptySave();
  for (let i = 0; i < 6; i++) {
    d = playCorrect(d, addDays(DAY, i));
  }
  expect(d.timeline.cards).toHaveLength(7);
  expect(songCount(d.timeline.cards)).toBe(6);
  expect(d.timeline.best).toBe(6);
  const years = d.timeline.cards.map((c) => c.year);
  expect(years).toEqual(years.toSorted((a, b) => a - b));
  expect(new Set(d.timeline.cards.map((c) => c.id)).size).toBe(7);
});

it("timeline mode: is idempotent within a day", () => {
  let d = playCorrect(emptySave(), DAY);
  expect(ensureTimelineDay(d, DAY)).toBe(d);
  d = placeTimelineCard(d, DAY, 0);
  expect(songCount(d.timeline.cards)).toBe(1);
});

it("timeline mode: ends the run on a wrong guess and restarts next day", () => {
  let d = playCorrect(emptySave(), DAY);
  d = playCorrect(d, addDays(DAY, 1));
  const day3 = addDays(DAY, 2);
  d = ensureTimelineDay(d, day3);
  const song = getSong(d.timeline.today!.songId)!;
  const right = correctSlot(d.timeline.cards, song.year);
  const wrong = [0, 1, 2, 3].find((s) => !isSlotCorrect(d.timeline.cards, s, song.year))!;
  expect(wrong).not.toBe(right);
  d = placeTimelineCard(d, day3, wrong);
  expect(d.timeline.runOver).toBe(true);
  expect(songCount(d.timeline.cards)).toBe(2);
  d = ensureTimelineDay(d, addDays(DAY, 3));
  expect(songCount(d.timeline.cards)).toBe(0);
  expect(d.timeline.cards[0]!.anchor).toBe(true);
  expect(d.timeline.best).toBe(2);
  expect(d.timeline.runs).toBe(1);
});

it("timeline mode: ends the run when a day is missed", () => {
  let d = playCorrect(emptySave(), DAY);
  d = playCorrect(d, addDays(DAY, 1));
  d = ensureTimelineDay(d, addDays(DAY, 3));
  expect(songCount(d.timeline.cards)).toBe(0);
});

it("timeline mode: gives an old in-progress save a starting year", () => {
  const base = ensureTimelineDay(emptySave(), DAY);
  const legacy: SaveData = { ...base, timeline: { ...base.timeline, cards: [] } };
  const d = ensureTimelineDay(legacy, DAY);
  expect(d.timeline.cards).toHaveLength(1);
  expect(d.timeline.cards[0]!.anchor).toBe(true);
});

it("timeline mode: can skip an unplayable song", () => {
  let d = ensureTimelineDay(emptySave(), DAY);
  const first = d.timeline.today!.songId;
  d = skipTimelineSong(d, DAY);
  expect(d.timeline.today!.songId).not.toBe(first);
  expect(d.timeline.today!.skipped).toEqual([first]);
});

it("song language settings: swaps a pending timeline song whose language was turned off", () => {
  let d = setSongLanguage(emptySave(), "he", false);
  d = ensureTimelineDay(d, DAY);
  expect(he(d.timeline.today!.songId)).toBe(false);
  const swapped = ensureTimelineDay(
    setSongLanguage(setSongLanguage(d, "he", true), "en", false),
    DAY,
  );
  expect(he(swapped.timeline.today!.songId)).toBe(true);
  // Answered days are left alone.
  const answered = placeTimelineCard(d, DAY, 0);
  const after = setSongLanguage(setSongLanguage(answered, "he", true), "en", false);
  expect(ensureTimelineDay(after, DAY)).toBe(after);
});

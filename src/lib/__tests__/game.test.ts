import { describe, expect, it } from "vitest";
import { addDays } from "../dates";
import { initialSortOrder, sortSongsFor, timelineSongFor } from "../daily";
import { getSong, SONGS } from "../songs";
import {
  emptySave,
  ensureSortDay,
  ensureTimelineDay,
  moveSortItem,
  placeTimelineCard,
  revealAnchor,
  skipTimelineSong,
  submitSort,
  type SaveData,
} from "../storage";
import { correctSlot, isSlotCorrect, slotLabel } from "../timeline";

const DAY = "2026-11-01";

describe("catalog", () => {
  it("has unique, well-formed entries", () => {
    const ids = new Set(SONGS.map((s) => s.youtubeId));
    expect(ids.size).toBe(SONGS.length);
    for (const s of SONGS) {
      expect(s.youtubeId).toMatch(/^[\w-]{11}$/);
      expect(s.year).toBeGreaterThan(1900);
      expect(s.title && s.artist).toBeTruthy();
    }
  });
});

describe("daily selection", () => {
  it("is deterministic and picks 5 distinct years", () => {
    const a = sortSongsFor(DAY);
    expect(a.map((s) => s.id)).toEqual(sortSongsFor(DAY).map((s) => s.id));
    expect(new Set(a.map((s) => s.year)).size).toBe(5);
    expect(sortSongsFor(addDays(DAY, 1)).map((s) => s.id)).not.toEqual(a.map((s) => s.id));
  });

  it("never starts already sorted", () => {
    for (let i = 0; i < 200; i++) {
      const years = initialSortOrder(addDays(DAY, i)).map((id) => getSong(id)!.year);
      expect(years).not.toEqual([...years].sort((x, y) => x - y));
    }
  });

  it("timeline song avoids today's sort songs and excluded ids", () => {
    const sortIds = new Set(sortSongsFor(DAY).map((s) => s.id));
    const first = timelineSongFor(DAY, new Set())!;
    expect(sortIds.has(first.id)).toBe(false);
    const second = timelineSongFor(DAY, new Set([first.id]))!;
    expect(second.id).not.toBe(first.id);
  });
});

describe("timeline slots", () => {
  const cards = [{ year: 1994 }, { year: 1997 }, { year: 2000 }];
  it("validates placement with ties allowed", () => {
    expect(isSlotCorrect(cards, 0, 1990)).toBe(true);
    expect(isSlotCorrect(cards, 2, 1998)).toBe(true);
    expect(isSlotCorrect(cards, 3, 2010)).toBe(true);
    expect(isSlotCorrect(cards, 1, 1997)).toBe(true);
    expect(isSlotCorrect(cards, 2, 1997)).toBe(true);
    expect(isSlotCorrect(cards, 0, 1998)).toBe(false);
    expect(correctSlot(cards, 1998)).toBe(2);
  });
  it("labels slots", () => {
    expect(slotLabel(cards, 0)).toBe("Before 1994");
    expect(slotLabel(cards, 2)).toBe("1997 – 2000");
    expect(slotLabel(cards, 3)).toBe("After 2000");
  });
});

describe("sort mode", () => {
  it("scores a perfect order and tracks streaks", () => {
    let d: SaveData = emptySave();
    for (const day of [DAY, addDays(DAY, 1)]) {
      d = ensureSortDay(d, day);
      const sorted = sortSongsFor(day)
        .slice()
        .sort((a, b) => a.year - b.year)
        .map((s) => s.id);
      d = { ...d, sort: { ...d.sort, days: { ...d.sort.days, [day]: { order: sorted, submitted: false } } } };
      d = submitSort(d, day);
      expect(d.sort.days[day].correct).toEqual([true, true, true, true, true]);
    }
    expect(d.sort.stats.streak).toBe(2);
    expect(d.sort.stats.perfect).toBe(2);
  });

  it("locks the order after submitting", () => {
    let d = ensureSortDay(emptySave(), DAY);
    d = submitSort(d, DAY);
    const before = d.sort.days[DAY].order;
    d = moveSortItem(d, DAY, 0, 1);
    expect(d.sort.days[DAY].order).toEqual(before);
  });
});

describe("timeline mode", () => {
  function playCorrect(d: SaveData, day: string): SaveData {
    d = ensureTimelineDay(d, day);
    const song = getSong(d.timeline.today!.songId)!;
    if (d.timeline.cards.length === 0) return revealAnchor(d, day);
    return placeTimelineCard(d, day, correctSlot(d.timeline.cards, song.year));
  }

  it("grows the timeline on consecutive correct days", () => {
    let d = emptySave();
    for (let i = 0; i < 6; i++) d = playCorrect(d, addDays(DAY, i));
    expect(d.timeline.cards).toHaveLength(6);
    expect(d.timeline.best).toBe(6);
    const years = d.timeline.cards.map((c) => c.year);
    expect(years).toEqual([...years].sort((a, b) => a - b));
    expect(new Set(d.timeline.cards.map((c) => c.id)).size).toBe(6);
  });

  it("is idempotent within a day", () => {
    let d = playCorrect(emptySave(), DAY);
    const again = ensureTimelineDay(d, DAY);
    expect(again).toBe(d);
    d = revealAnchor(d, DAY);
    expect(d.timeline.cards).toHaveLength(1);
  });

  it("ends the run on a wrong guess and restarts next day", () => {
    let d = playCorrect(emptySave(), DAY);
    d = playCorrect(d, addDays(DAY, 1));
    const day3 = addDays(DAY, 2);
    d = ensureTimelineDay(d, day3);
    const song = getSong(d.timeline.today!.songId)!;
    const right = correctSlot(d.timeline.cards, song.year);
    const wrong = [0, 1, 2].find((s) => !isSlotCorrect(d.timeline.cards, s, song.year))!;
    expect(wrong).not.toBe(right);
    d = placeTimelineCard(d, day3, wrong);
    expect(d.timeline.runOver).toBe(true);
    expect(d.timeline.cards).toHaveLength(2);
    d = ensureTimelineDay(d, addDays(DAY, 3));
    expect(d.timeline.cards).toHaveLength(0);
    expect(d.timeline.best).toBe(2);
    expect(d.timeline.runs).toBe(1);
  });

  it("ends the run when a day is missed", () => {
    let d = playCorrect(emptySave(), DAY);
    d = playCorrect(d, addDays(DAY, 1));
    d = ensureTimelineDay(d, addDays(DAY, 3));
    expect(d.timeline.cards).toHaveLength(0);
  });

  it("can skip an unplayable song", () => {
    let d = ensureTimelineDay(emptySave(), DAY);
    const first = d.timeline.today!.songId;
    d = skipTimelineSong(d, DAY);
    expect(d.timeline.today!.songId).not.toBe(first);
    expect(d.timeline.today!.skipped).toEqual([first]);
  });
});

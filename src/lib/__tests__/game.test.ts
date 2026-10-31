import { describe, expect, it } from "vitest";
import { MESSAGES } from "@/i18n/messages";
import { anchorYearFor, sortSongsFor, timelineSongFor } from "../daily";
import { addDays } from "../dates";
import { getSong, SONGS } from "../songs";
import {
  emptySave,
  ensureSortDay,
  ensureTimelineDay,
  placeSortSong,
  placeTimelineCard,
  type SaveData,
  setSongLanguage,
  skipTimelineSong,
  sortDayDone,
  sortLine,
} from "../storage";
import { correctSlot, isSlotCorrect, slotLabel, songCount } from "../timeline";

const DAY = "2026-11-01";

describe("catalog", () => {
  it("has unique, well-formed entries", () => {
    const ids = new Set(SONGS.map((s) => s.youtubeId));
    expect(ids.size).toBe(SONGS.length);
    // Stable ids and current videos never collide, so getSong() is unambiguous.
    const all = new Set(
      SONGS.flatMap((s) => (s.id === s.youtubeId ? [s.id] : [s.id, s.youtubeId])),
    );
    expect(all.size).toBe(SONGS.reduce((n, s) => n + (s.id === s.youtubeId ? 1 : 2), 0));
    for (const s of SONGS) {
      expect(s.youtubeId).toMatch(/^[\w-]{11}$/);
      expect(s.id).toMatch(/^[\w-]{11}$/);
      expect(getSong(s.id)).toBe(s);
      expect(getSong(s.youtubeId)).toBe(s);
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

  it("picks an anchor year different from the five songs", () => {
    for (let i = 0; i < 100; i++) {
      const day = addDays(DAY, i);
      const years = sortSongsFor(day).map((s) => s.year);
      expect(years).not.toContain(anchorYearFor(day));
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
    const en = MESSAGES.en.slots;
    expect(slotLabel([], 0, en)).toBe("Anywhere");
    expect(slotLabel(cards, 0, en)).toBe("Before 1994");
    expect(slotLabel(cards, 2, en)).toBe("1997 – 2000");
    expect(slotLabel(cards, 3, en)).toBe("After 2000");
    expect(slotLabel([{ year: 1997 }, { year: 1997 }], 1, en)).toBe("In 1997");
  });
});

describe("daily five", () => {
  function playDay(d: SaveData, day: string, rightFor: (i: number) => boolean): SaveData {
    d = ensureSortDay(d, day);
    for (let i = 0; i < 5; i++) {
      const state = d.sort.days[day]!;
      const line = sortLine(state);
      const song = getSong(state.songIds[i])!;
      const right = correctSlot(line, song.year);
      const wrong = right === 0 ? line.length : 0;
      d = placeSortSong(d, day, rightFor(i) ? right : wrong);
    }
    return d;
  }

  it("starts with only the anchor year", () => {
    const d = ensureSortDay(emptySave(), DAY);
    expect(sortLine(d.sort.days[DAY]!)).toEqual([{ kind: "anchor", year: anchorYearFor(DAY) }]);
  });

  it("scores a perfect day and tracks streaks", () => {
    let d = playDay(emptySave(), DAY, () => true);
    d = playDay(d, addDays(DAY, 1), () => true);
    expect(d.sort.days[DAY]!.placements.every((p) => p.correct)).toBe(true);
    expect(d.sort.stats.streak).toBe(2);
    expect(d.sort.stats.perfect).toBe(2);
    expect(d.sort.stats.played).toBe(2);
  });

  it("keeps the line in order even after wrong placements", () => {
    const d = playDay(emptySave(), DAY, (i) => i % 2 === 0);
    const state = d.sort.days[DAY]!;
    expect(sortDayDone(state)).toBe(true);
    expect(state.placements.map((p) => p.correct)).toEqual([true, false, true, false, true]);
    const years = sortLine(state).map((c) => c.year);
    expect(years).toHaveLength(6);
    expect(years).toEqual(years.toSorted((a, b) => a - b));
    expect(d.sort.stats.streak).toBe(0);
    expect(d.sort.stats.distribution[3]).toBe(1);
  });

  it("ignores placements after the day is done", () => {
    const d = playDay(emptySave(), DAY, () => true);
    expect(placeSortSong(d, DAY, 0)).toBe(d);
  });
});

describe("timeline mode", () => {
  function playCorrect(d: SaveData, day: string): SaveData {
    d = ensureTimelineDay(d, day);
    const song = getSong(d.timeline.today!.songId)!;
    return placeTimelineCard(d, day, correctSlot(d.timeline.cards, song.year));
  }

  it("starts a new timeline with a free starting year to guess against", () => {
    const d = ensureTimelineDay(emptySave(), DAY);
    const song = getSong(d.timeline.today!.songId)!;
    expect(d.timeline.cards).toHaveLength(1);
    expect(d.timeline.cards[0]!.anchor).toBe(true);
    expect(d.timeline.cards[0]!.year).not.toBe(song.year);
    expect(d.timeline.today!.result).toBe("pending");
  });

  it("counts day 1 as a real guess", () => {
    const d = playCorrect(emptySave(), DAY);
    expect(d.timeline.today!.result).toBe("correct");
    expect(songCount(d.timeline.cards)).toBe(1);
    expect(d.timeline.best).toBe(1);
  });

  it("grows the timeline on consecutive correct days", () => {
    let d = emptySave();
    for (let i = 0; i < 6; i++) d = playCorrect(d, addDays(DAY, i));
    expect(d.timeline.cards).toHaveLength(7);
    expect(songCount(d.timeline.cards)).toBe(6);
    expect(d.timeline.best).toBe(6);
    const years = d.timeline.cards.map((c) => c.year);
    expect(years).toEqual(years.toSorted((a, b) => a - b));
    expect(new Set(d.timeline.cards.map((c) => c.id)).size).toBe(7);
  });

  it("is idempotent within a day", () => {
    let d = playCorrect(emptySave(), DAY);
    expect(ensureTimelineDay(d, DAY)).toBe(d);
    d = placeTimelineCard(d, DAY, 0);
    expect(songCount(d.timeline.cards)).toBe(1);
  });

  it("ends the run on a wrong guess and restarts next day", () => {
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

  it("ends the run when a day is missed", () => {
    let d = playCorrect(emptySave(), DAY);
    d = playCorrect(d, addDays(DAY, 1));
    d = ensureTimelineDay(d, addDays(DAY, 3));
    expect(songCount(d.timeline.cards)).toBe(0);
  });

  it("gives an old in-progress save a starting year", () => {
    const base = ensureTimelineDay(emptySave(), DAY);
    const legacy: SaveData = { ...base, timeline: { ...base.timeline, cards: [] } };
    const d = ensureTimelineDay(legacy, DAY);
    expect(d.timeline.cards).toHaveLength(1);
    expect(d.timeline.cards[0]!.anchor).toBe(true);
  });

  it("can skip an unplayable song", () => {
    let d = ensureTimelineDay(emptySave(), DAY);
    const first = d.timeline.today!.songId;
    d = skipTimelineSong(d, DAY);
    expect(d.timeline.today!.songId).not.toBe(first);
    expect(d.timeline.today!.skipped).toEqual([first]);
  });
});

describe("song language settings", () => {
  const he = (id: string) => Boolean(getSong(id)?.titleHe);

  it("defaults to every language and leaves the shared puzzle unchanged", () => {
    const d = ensureSortDay(emptySave(), DAY);
    expect(d.settings.songLanguages).toEqual(["en", "he"]);
    expect(d.sort.days[DAY]!.songIds).toEqual(sortSongsFor(DAY).map((s) => s.id));
    expect(d.sort.days[DAY]!.anchorYear).toBe(anchorYearFor(DAY));
  });

  it("only picks songs in the chosen language", () => {
    for (const lang of ["en", "he"] as const) {
      let d = setSongLanguage(emptySave(), lang === "en" ? "he" : "en", false);
      for (let i = 0; i < 20; i++) {
        const day = addDays(DAY, i);
        d = ensureTimelineDay(ensureSortDay(d, day), day);
        expect(d.sort.days[day]!.songIds.every((id) => he(id) === (lang === "he"))).toBe(true);
        expect(he(d.timeline.today!.songId)).toBe(lang === "he");
      }
    }
  });

  it("never turns off the last language", () => {
    const d = setSongLanguage(emptySave(), "he", false);
    expect(setSongLanguage(d, "en", false)).toBe(d);
    expect(setSongLanguage(d, "en", true)).toBe(d);
  });

  it("re-picks today only if it hasn't been started", () => {
    let d = ensureSortDay(emptySave(), DAY);
    const before = d.sort.days[DAY]!.songIds;
    d = setSongLanguage(d, "en", false);
    const fresh = ensureSortDay(d, DAY);
    expect(fresh.sort.days[DAY]!.songIds).not.toEqual(before);
    expect(fresh.sort.days[DAY]!.songIds.every(he)).toBe(true);

    const started = placeSortSong(ensureSortDay(emptySave(), DAY), DAY, 0);
    const kept = setSongLanguage(started, "en", false);
    expect(ensureSortDay(kept, DAY)).toBe(kept);
  });

  it("swaps a pending timeline song whose language was turned off", () => {
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
});

describe("language balance", () => {
  const share = (ids: string[]) => ids.filter((id) => getSong(id)?.titleHe).length / ids.length;
  const days = Array.from({ length: 365 }, (_, i) => addDays(DAY, i));

  it("gives about half Israeli and half International songs when both are on", () => {
    const five = days.flatMap((d) => sortSongsFor(d).map((s) => s.id));
    const timeline = days.map((d) => timelineSongFor(d, new Set())!.id);
    expect(share(five)).toBeGreaterThan(0.45);
    expect(share(five)).toBeLessThan(0.55);
    expect(share(timeline)).toBeGreaterThan(0.4);
    expect(share(timeline)).toBeLessThan(0.6);
  });

  it("still uses every song once in a full day's order", () => {
    const ids = new Set(sortSongsFor(DAY).map((s) => s.id));
    expect(ids.size).toBe(5);
  });
});

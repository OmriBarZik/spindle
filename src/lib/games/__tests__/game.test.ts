import { expect, it } from "vitest";
import { MESSAGES } from "@/i18n/messages";
import { anchorYearFor, marathonSongsFor, sortSongsFor } from "@/lib/catalog/daily";
import { addDays } from "@/lib/catalog/dates";
import { getSong, SONGS } from "@/lib/catalog/songs";
import { ensureMarathonDay, marathonCurrent } from "@/lib/games/marathonState";
import { ensureSortDay, placeSortSong, sortDayDone, sortLine } from "@/lib/games/sortState";
import { correctSlot, isSlotCorrect, slotLabel } from "@/lib/line/timeline";
import type { SaveData } from "@/lib/save/saveData";
import { emptySave, setSongLanguage } from "@/lib/save/storage";

const DAY = "2026-11-01";

it("catalog: has unique, well-formed entries", () => {
  const ids = new Set(SONGS.map((s) => s.youtubeId));
  expect(ids.size).toBe(SONGS.length);
  // Stable ids and current videos never collide, so getSong() is unambiguous.
  const all = new Set(SONGS.flatMap((s) => (s.id === s.youtubeId ? [s.id] : [s.id, s.youtubeId])));
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

it("daily selection: is deterministic and picks 5 distinct years", () => {
  const a = sortSongsFor(DAY);
  expect(a.map((s) => s.id)).toEqual(sortSongsFor(DAY).map((s) => s.id));
  expect(new Set(a.map((s) => s.year)).size).toBe(5);
  expect(sortSongsFor(addDays(DAY, 1)).map((s) => s.id)).not.toEqual(a.map((s) => s.id));
});

it("daily selection: picks an anchor year different from the five songs", () => {
  for (let i = 0; i < 100; i++) {
    const day = addDays(DAY, i);
    const years = sortSongsFor(day).map((s) => s.year);
    expect(years).not.toContain(anchorYearFor(day));
  }
});

const cards = [{ year: 1994 }, { year: 1997 }, { year: 2000 }];
it("timeline slots: validates placement with ties allowed", () => {
  expect(isSlotCorrect(cards, 0, 1990)).toBe(true);
  expect(isSlotCorrect(cards, 2, 1998)).toBe(true);
  expect(isSlotCorrect(cards, 3, 2010)).toBe(true);
  expect(isSlotCorrect(cards, 1, 1997)).toBe(true);
  expect(isSlotCorrect(cards, 2, 1997)).toBe(true);
  expect(isSlotCorrect(cards, 0, 1998)).toBe(false);
  expect(correctSlot(cards, 1998)).toBe(2);
});
it("timeline slots: labels slots", () => {
  const en = MESSAGES.en.slots;
  expect(slotLabel([], 0, en)).toBe("Anywhere");
  expect(slotLabel(cards, 0, en)).toBe("Before 1994");
  expect(slotLabel(cards, 2, en)).toBe("1997 – 2000");
  expect(slotLabel(cards, 3, en)).toBe("After 2000");
  expect(slotLabel([{ year: 1997 }, { year: 1997 }], 1, en)).toBe("In 1997");
});

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

it("daily five: starts with only the anchor year", () => {
  const d = ensureSortDay(emptySave(), DAY);
  expect(sortLine(d.sort.days[DAY]!)).toEqual([{ kind: "anchor", year: anchorYearFor(DAY) }]);
});

it("daily five: scores a perfect day and tracks streaks", () => {
  let d = playDay(emptySave(), DAY, () => true);
  d = playDay(d, addDays(DAY, 1), () => true);
  expect(d.sort.days[DAY]!.placements.every((p) => p.correct)).toBe(true);
  expect(d.sort.stats.streak).toBe(2);
  expect(d.sort.stats.perfect).toBe(2);
  expect(d.sort.stats.played).toBe(2);
});

it("daily five: keeps the line in order even after wrong placements", () => {
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

it("daily five: ignores placements after the day is done", () => {
  const d = playDay(emptySave(), DAY, () => true);
  expect(placeSortSong(d, DAY, 0)).toBe(d);
});

const he = (id: string) => Boolean(getSong(id)?.titleHe);

it("song language settings: defaults to every language and leaves the shared puzzle unchanged", () => {
  const d = ensureSortDay(emptySave(), DAY);
  expect(d.settings.songLanguages).toEqual(["en", "he"]);
  expect(d.sort.days[DAY]!.songIds).toEqual(sortSongsFor(DAY).map((s) => s.id));
  expect(d.sort.days[DAY]!.anchorYear).toBe(anchorYearFor(DAY));
});

it("song language settings: only picks songs in the chosen language", () => {
  for (const lang of ["en", "he"] as const) {
    let d = setSongLanguage(emptySave(), lang === "en" ? "he" : "en", false);
    for (let i = 0; i < 20; i++) {
      const day = addDays(DAY, i);
      d = ensureMarathonDay(ensureSortDay(d, day), day);
      expect(d.sort.days[day]!.songIds.every((id) => he(id) === (lang === "he"))).toBe(true);
      expect(he(marathonCurrent(day, d.marathon.days[day]!)!.id)).toBe(lang === "he");
    }
  }
});

it("song language settings: never turns off the last language", () => {
  const d = setSongLanguage(emptySave(), "he", false);
  expect(setSongLanguage(d, "en", false)).toBe(d);
  expect(setSongLanguage(d, "en", true)).toBe(d);
});

it("song language settings: re-picks today only if it hasn't been started", () => {
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

const share = (ids: string[]) => ids.filter((id) => getSong(id)?.titleHe).length / ids.length;
const days = Array.from({ length: 365 }, (_, i) => addDays(DAY, i));

it("language balance: gives about half Israeli and half International songs when both are on", () => {
  const five = days.flatMap((d) => sortSongsFor(d).map((s) => s.id));
  const marathon = days.flatMap((d) =>
    marathonSongsFor(d)
      .slice(0, 20)
      .map((s) => s.id),
  );
  expect(share(five)).toBeGreaterThan(0.45);
  expect(share(five)).toBeLessThan(0.55);
  expect(share(marathon)).toBeGreaterThan(0.45);
  expect(share(marathon)).toBeLessThan(0.55);
});

it("language balance: still uses every song once in a full day's order", () => {
  const ids = new Set(sortSongsFor(DAY).map((s) => s.id));
  expect(ids.size).toBe(5);
});

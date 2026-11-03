import { expect, it } from "vitest";
import { marathonFreeAnchorYearFor, marathonFreeSongsFor, marathonSongsFor } from "@/lib/daily";
import { addDays } from "@/lib/dates";
import {
  challengePath,
  leaveFreeMarathon,
  marathonRun,
  newFreeSeed,
  parseChallenge,
  placeMarathon,
  skipMarathon,
  startChallenge,
  startFreeMarathon,
} from "@/lib/marathonFree";
import {
  ensureMarathonDay,
  marathonCurrent,
  marathonLine,
  marathonView,
} from "@/lib/marathonState";
import type { MarathonFreeRun, SaveData } from "@/lib/saveData";
import { emptySave } from "@/lib/storage";
import { correctSlot, isSlotCorrect } from "@/lib/timeline";

const DAY = "2026-11-01";
const SEED = "abc123xyz0";

/** Place the next song of the run on screen right or wrong. */
function placeNext(d: SaveData, day: string, right: boolean): SaveData {
  const { state } = marathonRun(d, day)!;
  const song = marathonCurrent(day, state)!;
  const line = marathonLine(state);
  const good = correctSlot(line, song.year);
  const bad = [0, line.length].find((s) => !isSlotCorrect(line, s, song.year))!;
  return placeMarathon(d, day, right ? good : bad);
}

/** Today's daily Marathon, played to the end with one song right. */
function dailyDone(): SaveData {
  let d = ensureMarathonDay(emptySave(), DAY);
  for (const right of [true, false, false, false]) {
    d = placeNext(d, DAY, right);
  }
  return d;
}

it("free play: can't start before the day's run is over", () => {
  const d = ensureMarathonDay(emptySave(), DAY);
  expect(startFreeMarathon(d, DAY, SEED)).toBe(d);
});

it("free play: has its own songs and starting year, and never touches the daily stats", () => {
  const done = dailyDone();
  const stats = done.marathon.stats;
  let d = startFreeMarathon(done, DAY, SEED);
  const run = marathonRun(d, DAY)!;
  expect(run).toMatchObject({ daily: 1, dailyDone: true });
  expect(run.state).toMatchObject({ day: DAY, seed: SEED, placements: [] });
  expect(run.state.anchorYear).toBe(marathonFreeAnchorYearFor(SEED, ["en", "he"]));
  const songs = marathonFreeSongsFor(SEED, ["en", "he"]);
  expect(songs.map((s) => s.id)).not.toEqual(marathonSongsFor(DAY).map((s) => s.id));
  expect(marathonCurrent(DAY, run.state)?.id).toBe(songs[0]!.id);

  d = skipMarathon(d, DAY);
  expect(d.marathon.free!.skipped).toEqual([songs[0]!.id]);
  for (const right of [true, true, false, false, false]) {
    d = placeNext(d, DAY, right);
  }
  expect(marathonView(DAY, d.marathon.free!)).toMatchObject({ done: true, hits: 2, hearts: 0 });
  expect(d.marathon.stats).toBe(stats);
  expect(d.marathon.days).toBe(done.marathon.days);
  // A finished run stays on screen; nothing more can be placed.
  expect(placeMarathon(d, DAY, 0)).toBe(d);

  // Play again: a new run replaces it.
  const again = startFreeMarathon(d, DAY, "xyz987abc0");
  expect(again.marathon.free).toMatchObject({ seed: "xyz987abc0", placements: [] });
});

it("free play: a run from another day isn't shown, so the new day starts with its daily", () => {
  const d = startFreeMarathon(dailyDone(), DAY, SEED);
  const next = addDays(DAY, 1);
  const tomorrow = ensureMarathonDay(d, next);
  expect(marathonRun(tomorrow, next)).toEqual({
    state: tomorrow.marathon.days[next],
    daily: null,
    dailyDone: false,
  });
});

it("free play: a random seed alone picks the songs, whatever the day", () => {
  const seed = newFreeSeed();
  expect(seed).toMatch(/^[a-z0-9]{10}$/);
  expect(newFreeSeed()).not.toBe(seed);
  const songs = marathonFreeSongsFor(seed).map((s) => s.id);
  expect(new Set(songs).size).toBe(songs.length);
  // A friend opening the run on another day gets the very same songs and starting year.
  const later = startFreeMarathon(dailyDone(), DAY, seed);
  expect(marathonCurrent(DAY, later.marathon.free!)?.id).toBe(songs[0]);
  expect(marathonFreeSongsFor(seed).map((s) => s.id)).toEqual(songs);
  expect(marathonFreeAnchorYearFor(seed)).toBe(marathonFreeAnchorYearFor(seed));
});

it("challenge: the link carries the seed, the score and single song languages", () => {
  let d = startFreeMarathon(dailyDone(), DAY, SEED);
  d = placeNext(d, DAY, true);
  const run = d.marathon.free!;
  expect(challengePath(run)).toBe(`/marathon?run=${SEED}&beat=1`);
  expect(parseChallenge(challengePath(run).split("?")[1]!)).toEqual({
    seed: SEED,
    beat: 1,
    languages: ["en", "he"],
  });
  const israeli = { ...run, languages: ["he" as const] };
  expect(challengePath(israeli)).toBe(`/marathon?run=${SEED}&beat=1&songs=he`);
  expect(parseChallenge(`?run=${SEED}&beat=4&songs=he`)).toEqual({
    seed: SEED,
    beat: 4,
    languages: ["he"],
  });
});

it.for([
  { name: "no link", search: "" },
  { name: "no score", search: `?run=${SEED}` },
  { name: "a negative score", search: `?run=${SEED}&beat=-1` },
  { name: "a fraction", search: `?run=${SEED}&beat=1.5` },
  { name: "an empty score", search: `?run=${SEED}&beat=` },
  { name: "a hex score", search: `?run=${SEED}&beat=0x10` },
  { name: "a score above the catalog", search: `?run=${SEED}&beat=9999` },
  { name: "a short seed", search: "?run=abc&beat=2" },
  { name: "a seed with capitals", search: "?run=ABC123XYZ0&beat=2" },
  { name: "markup in the seed", search: `?run=${SEED}%3Cscript%3E&beat=2` },
  { name: "a long seed", search: `?run=${SEED}${"a".repeat(20)}&beat=2` },
  { name: "markup in the score", search: `?run=${SEED}&beat=%3Cimg%20src%3Dx%3E` },
  { name: "an unknown song language", search: `?run=${SEED}&beat=2&songs=he,xx` },
  { name: "no song languages", search: `?run=${SEED}&beat=2&songs=` },
])("challenge: ignores $name", ({ search }) => {
  expect(parseChallenge(search)).toBeUndefined();
});

it("challenge: plays a friend's run before the day's, then goes back to the day's run", () => {
  const challenge = { seed: SEED, beat: 3, languages: ["he" as const] };
  const fresh = ensureMarathonDay(emptySave(), DAY);
  let d = startChallenge(fresh, DAY, challenge);
  const run = marathonRun(d, DAY)!;
  expect(run).toMatchObject({ daily: 0, dailyDone: false });
  expect(run.state).toMatchObject({ seed: SEED, beat: 3, languages: ["he"] });
  expect(marathonCurrent(DAY, run.state)?.id).toBe(marathonFreeSongsFor(SEED, ["he"])[0]!.id);
  // Opening the same link again (a reload) keeps the run going.
  d = placeNext(d, DAY, true);
  expect(startChallenge(d, DAY, challenge)).toBe(d);
  expect(startChallenge(d, DAY, undefined)).toBe(d);

  for (const right of [false, false, false]) {
    d = placeNext(d, DAY, right);
  }
  expect(d.marathon.days[DAY]).toBe(fresh.marathon.days[DAY]);
  // "Play again" needs the day's run first; "Play today's marathon" goes there.
  expect(startFreeMarathon(d, DAY, "other12345")).toBe(d);
  const back = leaveFreeMarathon(d);
  expect(back.marathon.free).toBeUndefined();
  expect(marathonRun(back, DAY)!.state).toBe(fresh.marathon.days[DAY]);
});

it("challenge: a hand-edited save with a broken free run is ignored", () => {
  const done = startFreeMarathon(dailyDone(), DAY, SEED);
  const free = done.marathon.free!;
  for (const broken of [
    { ...free, seed: "<script>" },
    { ...free, beat: -3 },
    { ...free, beat: "<b>1</b>" },
  ]) {
    const d = { ...done, marathon: { ...done.marathon, free: broken as MarathonFreeRun } };
    expect(marathonRun(d, DAY)!.state).toBe(d.marathon.days[DAY]);
  }
});

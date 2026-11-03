import { expect, it } from "vitest";
import { marathonFreeAnchorYearFor, marathonFreeSongsFor, marathonSongsFor } from "@/lib/daily";
import { addDays } from "@/lib/dates";
import { marathonRun, placeMarathon, skipMarathon, startFreeMarathon } from "@/lib/marathonFree";
import {
  ensureMarathonDay,
  marathonCurrent,
  marathonLine,
  marathonView,
} from "@/lib/marathonState";
import type { SaveData } from "@/lib/saveData";
import { emptySave } from "@/lib/storage";
import { correctSlot, isSlotCorrect } from "@/lib/timeline";

const DAY = "2026-11-01";

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
  expect(startFreeMarathon(d, DAY, "abc")).toBe(d);
});

it("free play: has its own songs and starting year, and never touches the daily stats", () => {
  const done = dailyDone();
  const stats = done.marathon.stats;
  let d = startFreeMarathon(done, DAY, "abc");
  const run = marathonRun(d, DAY)!;
  expect(run.daily).toBe(1);
  expect(run.state).toMatchObject({ day: DAY, seed: "abc", placements: [] });
  expect(run.state.anchorYear).toBe(marathonFreeAnchorYearFor(DAY, "abc", ["en", "he"]));
  const songs = marathonFreeSongsFor(DAY, "abc", ["en", "he"]);
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
  const again = startFreeMarathon(d, DAY, "xyz");
  expect(again.marathon.free).toMatchObject({ seed: "xyz", placements: [] });
});

it("free play: a run from another day isn't shown, so the new day starts with its daily", () => {
  const d = startFreeMarathon(dailyDone(), DAY, "abc");
  const next = addDays(DAY, 1);
  const tomorrow = ensureMarathonDay(d, next);
  expect(marathonRun(tomorrow, next)).toEqual({
    state: tomorrow.marathon.days[next],
    daily: null,
  });
});

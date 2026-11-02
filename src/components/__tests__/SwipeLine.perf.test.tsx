import { screen } from "@testing-library/react";
import { Profiler } from "react";
import { afterEach, expect, it } from "vitest";
import { MarathonGame } from "@/components/MarathonGame";
import { PITCH } from "@/hooks/useSwipePitch";
import { marathonAnchorYearFor, marathonSongsFor } from "@/lib/daily";
import { emptySave, writeSave } from "@/lib/storage";
import { correctSlot } from "@/lib/timeline";
import { setCpuThrottling } from "@/test/cpuThrottling";
import { renderIn } from "@/test/renderIn";
import { setupGameTests } from "@/test/setupGameTests";

const DAY = "2026-11-01";
const SONGS_ON_LINE = 40;
// Measured at 4x slowdown: about 170 ms and 17 ms when healthy, 1000 ms and 33 ms when
// every gap crossed re-renders the game. If these fail, swiping got slower: see "Swiping
// must stay cheap" in CLAUDE.md before raising them.
const MAX_REACT_MS = 500;
const MAX_FRAME_MS = 30;

setupGameTests(`${DAY}T10:00:00`);
afterEach(() => setCpuThrottling(1));

/** A long Marathon run, so there's plenty of line to swipe across. */
function saveLongRun() {
  const save = emptySave();
  const anchorYear = marathonAnchorYearFor(DAY);
  const line = [{ year: anchorYear }];
  const placements = marathonSongsFor(DAY)
    .slice(0, SONGS_ON_LINE)
    .map((song) => {
      const slot = correctSlot(line, song.year);
      line.splice(slot, 0, { year: song.year });
      return { songId: song.id, slot, correct: true };
    });
  save.marathon.days[DAY] = { anchorYear, languages: ["en", "he"], placements, skipped: [] };
  writeSave(save);
}

/** Scrolls the strip a bit every frame, and returns how long each frame took. */
function swipe(track: Element, distance: number, frames: number): Promise<number[]> {
  return new Promise((resolve) => {
    const times: number[] = [];
    let last = performance.now();
    const onFrame = (now: number) => {
      times.push(now - last);
      last = now;
      track.scrollLeft += distance / frames;
      if (times.length < frames) {
        requestAnimationFrame(onFrame);
      } else {
        resolve(times);
      }
    };
    requestAnimationFrame(onFrame);
  });
}

it("keeps swiping cheap on a slow phone", async () => {
  saveLongRun();
  const commits: number[] = [];
  renderIn(
    "en",
    <Profiler id="game" onRender={(_id, _phase, duration) => commits.push(duration)}>
      <MarathonGame />
    </Profiler>,
  );
  const track = screen.getByRole("group", { name: /^Your timeline/ });
  // Snapping would pull each small step back; a finger holds the strip against it.
  track.style.scrollSnapType = "none";
  track.scrollLeft = 0;
  // Let the strip's own positioning finish; passing gaps don't count until then.
  await new Promise((resolve) => setTimeout(resolve, 400));
  commits.length = 0;

  await setCpuThrottling(4);
  const frames = await swipe(track, PITCH * SONGS_ON_LINE, 200);

  // Crossing a gap only re-renders the place button and the overview bar. Rendering the
  // whole game per gap costs about six times as much, and drops frames.
  const reactTime = commits.reduce((total, duration) => total + duration, 0);
  const slowFrame = frames.toSorted((a, b) => a - b)[Math.floor(frames.length * 0.95)];
  expect(track.scrollLeft).toBeGreaterThan(0);
  expect(reactTime).toBeLessThan(MAX_REACT_MS);
  expect(slowFrame).toBeLessThan(MAX_FRAME_MS);
});

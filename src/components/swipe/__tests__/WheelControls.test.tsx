import { expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { SortGame } from "@/components/sort/SortGame";
import { mouseWheel } from "@/test/input/realMouse";
import {
  lineTrack,
  placeWithEnter,
  playSong,
  pointOn,
  recordGap,
  wheelOn,
} from "@/test/input/recordControls";
import { renderIn } from "@/test/renderIn";
import { setupGameTests } from "@/test/setupGameTests";

setupGameTests();

it("moves the record a gap later per wheel notch, over the record itself too", async () => {
  const { container } = renderIn("en", <SortGame />);
  await userEvent.keyboard("{Home}");
  const record = container.querySelector(".swipe-record button")!;
  await mouseWheel(pointOn(record, 0.5, 0.5), 100);
  await expect.poll(() => recordGap(container)).toBe(1);
});

it("moves the record earlier on a wheel up, and lets the page scroll at either end", async () => {
  const { container } = renderIn("en", <SortGame />);
  const track = lineTrack(container);
  await userEvent.keyboard("{End}");
  expect(wheelOn(track, { deltaY: 100 })).toBe(false);
  expect(wheelOn(track, { deltaY: -100 })).toBe(true);
  await expect.poll(() => recordGap(container)).toBe(0);
  expect(wheelOn(track, { deltaY: -100 })).toBe(false);
  expect(recordGap(container)).toBe(0);
});

it("moves one gap for a burst of small trackpad scrolls", async () => {
  const { container } = renderIn("en", <SortGame />);
  // Three cards on the line, so four gaps to move through.
  await placeWithEnter(container, 2);
  await userEvent.keyboard("{Home}");
  for (let i = 0; i < 10; i++) {
    expect(wheelOn(lineTrack(container), { deltaY: 30 })).toBe(true);
  }
  await expect.poll(() => recordGap(container)).toBe(1);
});

it("counts wheel lines as well as pixels", async () => {
  const { container } = renderIn("en", <SortGame />);
  await userEvent.keyboard("{Home}");
  wheelOn(lineTrack(container), { deltaY: 3, deltaMode: WheelEvent.DOM_DELTA_LINE });
  await expect.poll(() => recordGap(container)).toBe(1);
});

it.for([
  { name: "sideways wheels", init: { deltaX: 100, deltaY: 10 } },
  { name: "Ctrl + wheel (zoom)", init: { deltaY: 100, ctrlKey: true } },
])("leaves $name to the browser", async ({ init }) => {
  const { container } = renderIn("en", <SortGame />);
  await userEvent.keyboard("{Home}");
  expect(wheelOn(lineTrack(container), init)).toBe(false);
  expect(recordGap(container)).toBe(0);
});

it("ignores the wheel while the answer is showing", async () => {
  const { container } = renderIn("en", <SortGame />);
  await playSong();
  await userEvent.keyboard("{Home}");
  await userEvent.keyboard("{Enter}");
  const before = recordGap(container);
  expect(wheelOn(lineTrack(container), { deltaY: 100 })).toBe(false);
  expect(recordGap(container)).toBe(before);
});

it("scrolls a finished line sideways, until its end", async () => {
  const { container } = renderIn("en", <SortGame />);
  await placeWithEnter(container, 5);
  const track = lineTrack(container);
  track.scrollLeft = 0;
  expect(wheelOn(track, { deltaY: -100 })).toBe(false);
  expect(wheelOn(track, { deltaY: 100 })).toBe(true);
  // Proximity snapping may round the step to the nearest card.
  await expect.poll(() => track.scrollLeft).toBeGreaterThan(0);
  track.scrollLeft = track.scrollWidth;
  expect(wheelOn(track, { deltaY: 100 })).toBe(false);
});

import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { SortGame } from "@/components/SortGame";
import { PITCH } from "@/hooks/useSwipePitch";
import { mouseDrag } from "@/test/realMouse";
import {
  gapUnderRecord,
  lineTrack,
  placeWithEnter,
  playSong,
  pointOn,
  recordGap,
  tapAt,
} from "@/test/recordControls";
import { renderIn } from "@/test/renderIn";
import { setupGameTests } from "@/test/setupGameTests";

// The line is as wide as a phone here (390px), so one gap-to-gap step is `PITCH`.
setupGameTests();

it("moves the record to the gap nearest a click on the line", async () => {
  const { container } = renderIn("en", <SortGame />);
  await userEvent.keyboard("{End}");
  // Near the starting year's left edge: closer to the gap before it than after it.
  const card = container.querySelector<HTMLElement>('[data-item="0"] .swipe-card')!;
  await userEvent.click(card, { position: { x: 4, y: 20 } });
  expect(recordGap(container)).toBe(0);
  // Near the strip's right edge: the gap after it.
  tapAt(lineTrack(container), pointOn(lineTrack(container), 0.95, 0.3), "mouse");
  await expect.poll(() => recordGap(container)).toBe(1);
});

it("leaves a click on a card's link to the link", async () => {
  const { container } = renderIn("en", <SortGame />);
  await placeWithEnter(container, 1);
  const before = recordGap(container);
  const link = container.querySelector(".swipe-card a")!;
  // The link is a gap or more away from the record.
  tapAt(link, pointOn(link, 0.5, 0.5), "mouse");
  expect(recordGap(container)).toBe(before);
});

it("leaves taps to the browser, which scrolls the strip itself", async () => {
  const { container } = renderIn("en", <SortGame />);
  await userEvent.keyboard("{End}");
  tapAt(lineTrack(container), pointOn(lineTrack(container), 0.05, 0.3), "touch");
  expect(recordGap(container)).toBe(1);
});

it("drags the line with the mouse, and settles on the nearest gap", async () => {
  const { container } = renderIn("en", <SortGame />);
  const track = lineTrack(container);
  await playSong();
  await userEvent.keyboard("{Home}");
  // Let the strip glide there first: a drag takes over from wherever it is.
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 0, centred: true });
  const [x, y] = pointOn(track, 0.95, 0.3);
  // A bit more than one gap to the left: the next gap (later) comes under the record.
  await mouseDrag([x, y], [x - 1.2 * PITCH, y]);
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 1, centred: true });
  expect(recordGap(container)).toBe(1);
  expect(screen.getByRole("button", { name: /^Place it: After / })).toBeTruthy();
  expect(track.classList.contains("swipe-dragging")).toBe(false);
  // Dragging selected no text, and a drag isn't a click.
  expect(window.getSelection()?.toString()).toBe("");
});

it("drags the other way on right-to-left pages", async ({ onTestFinished }) => {
  document.documentElement.dir = "rtl";
  onTestFinished(() => {
    document.documentElement.removeAttribute("dir");
  });
  const { container } = renderIn("he", <SortGame />);
  const track = lineTrack(container);
  await userEvent.keyboard("{Home}");
  // Let the strip glide there first: a drag takes over from wherever it is.
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 0, centred: true });
  const [x, y] = pointOn(track, 0.05, 0.3);
  await mouseDrag([x, y], [x + 1.2 * PITCH, y]);
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 1, centred: true });
  expect(recordGap(container)).toBe(1);
});

it("stays put after a drag too short to reach the next gap", async () => {
  const { container } = renderIn("en", <SortGame />);
  const track = lineTrack(container);
  await userEvent.keyboard("{Home}");
  // Let the strip glide there first: a drag takes over from wherever it is.
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 0, centred: true });
  const [x, y] = pointOn(track, 0.95, 0.3);
  await mouseDrag([x, y], [x - 0.3 * PITCH, y]);
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 0, centred: true });
  expect(recordGap(container)).toBe(0);
});

it("drags a finished line to look through it", async () => {
  const { container } = renderIn("en", <SortGame />);
  await placeWithEnter(container, 5);
  const track = lineTrack(container);
  track.scrollLeft = 0;
  const [x, y] = pointOn(track, 0.9, 0.3);
  await mouseDrag([x, y], [x - 200, y]);
  await expect.poll(() => track.scrollLeft).toBeGreaterThan(100);
});

it("follows a drag that interrupts the strip's glide to a key press", async () => {
  const { container } = renderIn("en", <SortGame />);
  const track = lineTrack(container);
  await userEvent.keyboard("{End}");
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 1, centred: true });
  // Mid-glide back to the first gap, the player grabs the strip and pulls it back.
  await userEvent.keyboard("{Home}");
  const [x, y] = pointOn(track, 0.95, 0.3);
  await mouseDrag([x, y], [x - 1.2 * PITCH, y]);
  // Wherever it lands, the record and the place button agree with the strip.
  await expect.poll(() => gapUnderRecord(container).centred).toBe(true);
  expect(recordGap(container)).toBe(gapUnderRecord(container).gap);
});

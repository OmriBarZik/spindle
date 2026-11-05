import { expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { SortGame } from "@/components/sort/SortGame";
import { PITCH } from "@/hooks/swipe/useSwipePitch";
import { mouseDrag } from "@/test/input/realMouse";
import {
  gapUnderRecord,
  lineTrack,
  placeWithEnter,
  playSong,
  pointOn,
  recordGap,
  tapAt,
} from "@/test/input/recordControls";
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

it("keeps the line still while placing: only the record is dragged", async () => {
  const { container } = renderIn("en", <SortGame />);
  const track = lineTrack(container);
  await playSong();
  await userEvent.keyboard("{Home}");
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 0, centred: true });
  const [x, y] = pointOn(track, 0.95, 0.3);
  await mouseDrag([x, y], [x - 1.2 * PITCH, y]);
  expect(gapUnderRecord(container)).toEqual({ gap: 0, centred: true });
  expect(recordGap(container)).toBe(0);
  expect(track.classList.contains("swipe-dragging")).toBe(false);
  // Dragging selected no text, and a drag isn't a click.
  expect(window.getSelection()?.toString()).toBe("");
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

it("shows the grab cursor on a finished line, which can be dragged", async () => {
  const { container } = renderIn("en", <SortGame />);
  await placeWithEnter(container, 5);
  expect(getComputedStyle(lineTrack(container)).cursor).toBe("grab");
});

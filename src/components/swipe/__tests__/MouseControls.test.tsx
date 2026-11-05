import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { SortGame } from "@/components/sort/SortGame";
import { PITCH } from "@/hooks/swipe/useSwipePitch";
import { mouseDrag, mouseHold, mouseUp } from "@/test/input/realMouse";
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

/** The record on the line, which the mouse can grab. */
function lineRecord(container: HTMLElement): HTMLElement {
  return container.querySelector<HTMLElement>(".swipe-grab")!;
}

it("drags the record along the line to a later gap, and settles there", async () => {
  const { container } = renderIn("en", <SortGame />);
  await playSong();
  await userEvent.keyboard("{Home}");
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 0, centred: true });
  const [x, y] = pointOn(lineRecord(container), 0.5, 0.5);
  // Pulling the record right moves it later, the opposite way to pulling the strip.
  await mouseDrag([x, y], [x + 1.2 * PITCH, y]);
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 1, centred: true });
  expect(recordGap(container)).toBe(1);
  expect(screen.getByRole("button", { name: /^Place it: After / })).toBeTruthy();
  expect(lineRecord(container).classList.contains("swipe-dragging")).toBe(false);
  // A drag isn't a click: the song keeps playing.
  expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
});

it("drags the record the other way on right-to-left pages", async ({ onTestFinished }) => {
  document.documentElement.dir = "rtl";
  onTestFinished(() => {
    document.documentElement.removeAttribute("dir");
  });
  const { container } = renderIn("he", <SortGame />);
  await userEvent.keyboard("{Home}");
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 0, centred: true });
  const [x, y] = pointOn(lineRecord(container), 0.5, 0.5);
  // Later is to the left in Hebrew.
  await mouseDrag([x, y], [x - 1.2 * PITCH, y]);
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 1, centred: true });
  expect(recordGap(container)).toBe(1);
});

it("still plays the song on a click on the record, without moving it", async () => {
  const { container } = renderIn("en", <SortGame />);
  const before = recordGap(container);
  await playSong();
  expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
  expect(recordGap(container)).toBe(before);
});

it("leaves the record to touch, which only plays it", async () => {
  const { container } = renderIn("en", <SortGame />);
  await userEvent.keyboard("{Home}");
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 0, centred: true });
  const record = lineRecord(container);
  const [x, y] = pointOn(record, 0.9, 0.5);
  const init = { pointerType: "touch", pointerId: 1, button: 0, clientY: y, bubbles: true };
  record.dispatchEvent(new PointerEvent("pointerdown", { ...init, clientX: x }));
  record.dispatchEvent(new PointerEvent("pointermove", { ...init, clientX: x + 2 * PITCH }));
  record.dispatchEvent(new PointerEvent("pointerup", { ...init, clientX: x + 2 * PITCH }));
  expect(gapUnderRecord(container)).toEqual({ gap: 0, centred: true });
  expect(recordGap(container)).toBe(0);
});

it("stays put after a record drag too short to reach the next gap", async () => {
  const { container } = renderIn("en", <SortGame />);
  await userEvent.keyboard("{Home}");
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 0, centred: true });
  const [x, y] = pointOn(lineRecord(container), 0.5, 0.5);
  await mouseDrag([x, y], [x + 0.3 * PITCH, y]);
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 0, centred: true });
  expect(recordGap(container)).toBe(0);
});

it("follows a record drag that interrupts the strip's glide to a key press", async () => {
  const { container } = renderIn("en", <SortGame />);
  await userEvent.keyboard("{End}");
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 1, centred: true });
  // Mid-glide back to the first gap, the player grabs the record and pulls it later.
  await userEvent.keyboard("{Home}");
  const [x, y] = pointOn(lineRecord(container), 0.5, 0.5);
  await mouseDrag([x, y], [x + 1.2 * PITCH, y]);
  // Wherever it lands, the record and the place button agree with the strip.
  await expect.poll(() => gapUnderRecord(container).centred).toBe(true);
  expect(recordGap(container)).toBe(gapUnderRecord(container).gap);
});

/**
 * Sends one pointer event to the record, without moving (so the press is held between
 * calls). "pointerout" leaves it for the page, which React reports as a pointer leave.
 */
function pressRecord(record: HTMLElement, type: string, pointerType = "mouse") {
  const [x, y] = pointOn(record, 0.9, 0.5);
  const init = { pointerType, pointerId: 1, button: 0, clientX: x, clientY: y, bubbles: true };
  record.dispatchEvent(new PointerEvent(type, { ...init, relatedTarget: document.body }));
}

it("lifts the record off the line while it's held, and drops it when let go", async () => {
  const { container } = renderIn("en", <SortGame />);
  const record = lineRecord(container);
  pressRecord(record, "pointerdown");
  expect(record.classList.contains("swipe-lifted")).toBe(true);
  // Raised above the line, and bigger.
  await expect.poll(() => new DOMMatrix(getComputedStyle(record).transform).f).toBeLessThan(0);
  expect(new DOMMatrix(getComputedStyle(record).transform).a).toBeGreaterThan(1);
  pressRecord(record, "pointerup");
  expect(record.classList.contains("swipe-lifted")).toBe(false);
  await expect.poll(() => getComputedStyle(record).transform).toBe("none");
});

it("puts the record back down when the mouse slips off it without dragging", () => {
  const { container } = renderIn("en", <SortGame />);
  const record = lineRecord(container);
  pressRecord(record, "pointerdown");
  pressRecord(record, "pointerout");
  expect(record.classList.contains("swipe-lifted")).toBe(false);
});

it("never lifts the record for touch", () => {
  const { container } = renderIn("en", <SortGame />);
  const record = lineRecord(container);
  pressRecord(record, "pointerdown", "touch");
  expect(record.classList.contains("swipe-lifted")).toBe(false);
});

/** How far (px) the record has been pulled sideways from the middle. */
function recordPull(record: HTMLElement): number {
  return Number.parseFloat(record.style.translate || "0");
}

/** How far (px) the record has been pulled down (up is negative). */
function recordGive(record: HTMLElement): number {
  return Number.parseFloat(record.style.translate.split(" ")[1] ?? "0");
}

it("moves the record with the mouse over a still line, short of the next card", async () => {
  const { container } = renderIn("en", <SortGame />);
  await userEvent.keyboard("{Home}");
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 0, centred: true });
  const record = lineRecord(container);
  const [x, y] = pointOn(record, 0.5, 0.5);
  await mouseHold([x, y], [x + 0.3 * PITCH, y]);
  expect(recordPull(record)).toBeCloseTo(0.3 * PITCH, 0);
  expect(gapUnderRecord(container)).toEqual({ gap: 0, centred: true });
  expect(recordGap(container)).toBe(0);
  await mouseUp();
  // Let go short of the card: back onto the same gap.
  expect(recordPull(record)).toBe(0);
  expect(recordGap(container)).toBe(0);
});

it("pushes the line a gap at a time while the record is held against the next card", async () => {
  const { container } = renderIn("en", <SortGame />);
  // A longer line: the starting year and three songs, so five gaps.
  await placeWithEnter(container, 3);
  await userEvent.keyboard("{Home}");
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 0, centred: true });
  const record = lineRecord(container);
  const [x, y] = pointOn(record, 0.5, 0.5);
  // Well past the card: the record stops at it, half a gap-to-gap step away.
  await mouseHold([x, y], [x + 2 * PITCH, y]);
  expect(recordPull(record)).toBe(PITCH / 2);
  await expect.poll(() => recordGap(container)).toBeGreaterThanOrEqual(1);
  // Held there, the line keeps moving.
  await expect.poll(() => recordGap(container), { timeout: 3000 }).toBeGreaterThanOrEqual(3);
  await mouseUp();
  const chosen = recordGap(container);
  expect(recordPull(record)).toBe(0);
  // Let go, it stops: the record drops onto the gap in the middle.
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: chosen, centred: true });
  expect(record.classList.contains("swipe-lifted")).toBe(false);
});

/** Holds the record against the next card, so the line keeps moving. */
async function holdAgainstCard(container: HTMLElement): Promise<HTMLElement> {
  await placeWithEnter(container, 3);
  await userEvent.keyboard("{Home}");
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 0, centred: true });
  const record = lineRecord(container);
  const [x, y] = pointOn(record, 0.5, 0.5);
  await mouseHold([x, y], [x + 2 * PITCH, y]);
  await expect.poll(() => recordGap(container)).toBeGreaterThanOrEqual(1);
  return record;
}

/** The line has stopped: the record's gap holds still for longer than a push takes. */
async function expectStopped(container: HTMLElement) {
  const gap = recordGap(container);
  await new Promise((resolve) => {
    setTimeout(resolve, 900);
  });
  expect(recordGap(container)).toBe(gap);
}

it.for([
  {
    name: "a release outside the record",
    event: () => new PointerEvent("pointerup", { pointerId: 1, bubbles: true }),
    on: () => document.body,
  },
  { name: "the window losing focus", event: () => new FocusEvent("blur"), on: () => window },
])("lets go of the record on $name", async ({ event, on }, { onTestFinished }) => {
  onTestFinished(() => mouseUp());
  const { container } = renderIn("en", <SortGame />);
  const record = await holdAgainstCard(container);
  on().dispatchEvent(event());
  expect(record.classList.contains("swipe-lifted")).toBe(false);
  expect(recordPull(record)).toBe(0);
  await expectStopped(container);
});

it("lets go of the record when the mouse moves with its button up, though no release came", async ({
  onTestFinished,
}) => {
  onTestFinished(() => mouseUp());
  const { container } = renderIn("en", <SortGame />);
  const record = await holdAgainstCard(container);
  const [x, y] = pointOn(record, 0.5, 0.5);
  record.dispatchEvent(
    new PointerEvent("pointermove", {
      pointerType: "mouse",
      pointerId: 1,
      buttons: 0,
      clientX: x,
      clientY: y,
      bubbles: true,
    }),
  );
  expect(record.classList.contains("swipe-lifted")).toBe(false);
  await expectStopped(container);
});

it.for([
  { name: "down", dy: 400, sign: 1 },
  { name: "up", dy: -400, sign: -1 },
])("drags the record a little $name, however far the mouse goes", async ({ dy, sign }) => {
  const { container } = renderIn("en", <SortGame />);
  await userEvent.keyboard("{Home}");
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 0, centred: true });
  const record = lineRecord(container);
  const [x, y] = pointOn(record, 0.5, 0.5);
  // A small move up or down: the record goes right with the mouse.
  await mouseHold([x, y], [x + 0.2 * PITCH, y + sign * 10]);
  expect(recordGive(record)).toBeCloseTo(sign * 10, 0);
  await mouseUp();
  // A long one stops it a little way off the line: 24px (`SLACK`).
  await mouseHold([x, y], [x + 0.2 * PITCH, y + dy]);
  expect(recordGive(record)).toBe(sign * 24);
  // Up and down never moves the line.
  expect(gapUnderRecord(container)).toEqual({ gap: 0, centred: true });
  await mouseUp();
  expect(record.style.translate).toBe("");
});

it("shows the grab cursor on the record only, and a pointer on the Earlier / Later buttons", async () => {
  const { container } = renderIn("en", <SortGame />);
  await userEvent.keyboard("{Home}");
  const cursor = (el: Element) => getComputedStyle(el).cursor;
  expect(cursor(lineRecord(container))).toBe("grab");
  expect(cursor(lineTrack(container))).toBe("auto");
  const later = screen.getByRole("button", { name: "Later" });
  const earlier = screen.getByRole("button", { name: "Earlier" });
  expect(cursor(later)).toBe("pointer");
  // At the first gap, Earlier can't be pressed: no pointer.
  await expect.poll(() => earlier.hasAttribute("disabled")).toBe(true);
  expect(cursor(earlier)).not.toBe("pointer");
});

it("shows the grab cursor on a finished line, which can be dragged", async () => {
  const { container } = renderIn("en", <SortGame />);
  await placeWithEnter(container, 5);
  expect(getComputedStyle(lineTrack(container)).cursor).toBe("grab");
});

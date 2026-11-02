import { fireEvent, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { SortGame } from "@/components/SortGame";
import { trackedEvents } from "@/test/fakeAnalytics";
import { recordGap } from "@/test/recordControls";
import { renderIn } from "@/test/renderIn";
import { savedData } from "@/test/savedData";
import { setupGameTests } from "@/test/setupGameTests";

setupGameTests();

const DAY = "2026-11-01";

function placements() {
  return savedData().sort.days[DAY]?.placements.length ?? 0;
}

function track(container: HTMLElement): HTMLElement {
  return container.querySelector<HTMLElement>(".swipe-track")!;
}

/** Turns the mouse wheel over the line; returns whether the game took the event. */
function wheel(container: HTMLElement, deltaY: number): boolean {
  const event = new WheelEvent("wheel", { deltaY, bubbles: true, cancelable: true });
  track(container).dispatchEvent(event);
  return event.defaultPrevented;
}

it("plays with Space and places with Enter, with nothing focused", async () => {
  const { container } = renderIn("en", <SortGame />);
  expect(screen.getByRole("button", { name: "Play" }).getAttribute("aria-keyshortcuts")).toBe(
    "Space",
  );
  await userEvent.keyboard(" ");
  expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
  expect(trackedEvents().map(([name]) => name)).toContain("song_play");

  await userEvent.keyboard("{Enter}");
  expect(placements()).toBe(1);
  // Locked while the record shows the answer.
  await userEvent.keyboard("{Enter}");
  expect(placements()).toBe(1);
  fireEvent.animationEnd(container.querySelector(".deck-swap")!);
});

it("leaves Enter to a focused button", async () => {
  const { container } = renderIn("en", <SortGame />);
  await userEvent.keyboard("{End}");
  screen.getByRole("button", { name: "Earlier" }).focus();
  await userEvent.keyboard("{Enter}");
  expect(recordGap(container)).toBe(0);
  expect(placements()).toBe(0);
});

it("moves the record to the gap nearest a click on the line", async () => {
  const { container } = renderIn("en", <SortGame />);
  await userEvent.keyboard("{End}");
  // Near the starting year's left edge: closer to the gap before it than after it.
  const card = container.querySelector<HTMLElement>('[data-item="0"] .swipe-card')!;
  await userEvent.click(card, { position: { x: 4, y: 20 } });
  expect(recordGap(container)).toBe(0);
});

it("moves the record a gap per wheel notch, and lets the page scroll at either end", async () => {
  const { container } = renderIn("en", <SortGame />);
  await userEvent.keyboard("{End}");
  expect(wheel(container, -100)).toBe(true);
  await expect.poll(() => recordGap(container)).toBe(0);
  // Already at the start: the page scrolls instead.
  expect(wheel(container, -100)).toBe(false);
  expect(recordGap(container)).toBe(0);
});

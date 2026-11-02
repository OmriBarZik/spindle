import { act, fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { TimelineGame } from "@/components/TimelineGame";
import { MESSAGES } from "@/i18n/messages";
import { getSong } from "@/lib/songs";
import { correctSlot, isSlotCorrect, slotLabel } from "@/lib/timeline";
import { expectAccessible } from "@/test/expectAccessible";
import { trackedEvents } from "@/test/fakeAnalytics";
import { fakeClipboard } from "@/test/fakeClipboard";
import { fakeYouTube } from "@/test/fakeYouTube";
import { moveRecordTo } from "@/test/recordControls";
import { renderIn } from "@/test/renderIn";
import { savedData } from "@/test/savedData";
import { setupGameTests } from "@/test/setupGameTests";

setupGameTests();

function today() {
  const t = savedData().timeline;
  return { cards: t.cards, song: getSong(t.today?.songId)! };
}

async function placeAt(slot: number, container: HTMLElement) {
  const { cards } = today();
  await moveRecordTo(container, slot);
  await userEvent.click(
    screen.getByRole("button", {
      name: `Place it: ${slotLabel(cards, slot, MESSAGES.en.placeAt)}`,
    }),
  );
  expect(fakeYouTube.stops).toBeGreaterThan(0);
  const swap = container.querySelector(".deck-swap-flash");
  expect(swap).not.toBeNull();
  fireEvent.animationEnd(swap!);
}

async function shareAndRead() {
  const copied = fakeClipboard();
  await userEvent.click(screen.getByRole("button", { name: "Share result" }));
  await vi.waitFor(() => expect(copied).toHaveLength(1));
  return copied[0];
}

it("starts a new timeline at a free starting year", () => {
  const { container } = renderIn("en", <TimelineGame />);
  const { cards } = today();
  expect(cards).toHaveLength(1);
  expect(container.textContent).toContain(
    `Day 1 of a new timeline, starting at ${cards[0]!.year}.`,
  );
  expect(container.textContent).toContain("Starting year");
  expect(screen.getByText("Today")).toBeTruthy();
  // One gap on each side of the starting year; the record starts after it.
  expect(container.querySelectorAll("[data-gap]")).toHaveLength(2);
  expect(screen.getByRole("button", { name: `Place it: After ${cards[0]!.year}` })).toBeTruthy();
});

it("grows the timeline on a right guess", async () => {
  const { container } = renderIn("en", <TimelineGame />);
  const { cards, song } = today();
  await placeAt(correctSlot(cards, song.year), container);
  expect(container.textContent).toContain("Nailed it! ✅");
  expect(container.textContent).toContain("Your timeline now has 1 song.");
  // The answer is revealed once placed.
  expect(container.textContent).toContain(song.title);
  expect(container.querySelector("[data-gap]")).toBeNull();
  expect(await shareAndRead()).toBe(
    `Spindle Timeline #1\n🔥 1 song and counting\n🟩\n${window.location.origin}/timeline`,
  );
});

it("ends the run on a wrong guess and shows where the song belongs", async () => {
  const { container } = renderIn("en", <TimelineGame />);
  const { cards, song } = today();
  const wrong = [0, 1].find((s) => !isSlotCorrect(cards, s, song.year))!;
  await placeAt(wrong, container);
  expect(container.textContent).toContain("Not quite ❌");
  expect(container.textContent).toContain(`“${song.title}” came out in ${song.year}.`);
  expect(container.textContent).toContain("belongs here");
  expect(savedData().timeline.runOver).toBe(true);
  expect(await shareAndRead()).toBe(
    `Spindle Timeline #1\n❌ Timeline ended at 0 songs\n🟥\n${window.location.origin}/timeline`,
  );
});

it("sends analytics events for a run that ends", async () => {
  const { container } = renderIn("en", <TimelineGame />);
  const { cards, song } = today();
  const wrong = [0, 1].find((s) => !isSlotCorrect(cards, s, song.year))!;
  await placeAt(wrong, container);
  const mode = "timeline";
  expect(trackedEvents()).toEqual([
    ["game_open", { mode, status: "new" }],
    ["song_place", { mode, turn: 1, correct: false }],
    ["run_end", { mode, songs: 0 }],
  ]);
});

it("keeps the run going the next day", async () => {
  const first = renderIn("en", <TimelineGame />);
  const { cards, song } = today();
  await placeAt(correctSlot(cards, song.year), first.container);
  first.unmount();
  vi.setSystemTime(new Date("2026-11-02T10:00:00"));
  const { container } = renderIn("en", <TimelineGame />);
  expect(container.textContent).toContain("Timeline day 2 · Best 1");
  expect(container.querySelectorAll("[data-gap]")).toHaveLength(3);
});

it("offers a different song when the video can't play", async () => {
  const { container } = renderIn("en", <TimelineGame />);
  const { song } = today();
  await userEvent.click(screen.getByRole("button", { name: "Play" }));
  act(() => fakeYouTube.failVideo());
  expect(container.textContent).toContain("This song can't be played here");
  await userEvent.click(screen.getByRole("button", { name: "Give me a different song" }));
  expect(savedData().timeline.today?.skipped).toEqual([song.id]);
  expect(trackedEvents().at(-1)).toEqual(["song_skip", { mode: "timeline" }]);
});

it("has no accessibility violations", async () => {
  const { container } = renderIn("en", <TimelineGame />);
  await expectAccessible(container);
  const { cards, song } = today();
  await placeAt(correctSlot(cards, song.year), container);
  await expectAccessible(container);
});

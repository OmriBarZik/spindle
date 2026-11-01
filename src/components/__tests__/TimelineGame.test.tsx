import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import TimelineGame from "@/components/TimelineGame";
import { MESSAGES } from "@/i18n/messages";
import { getSong } from "@/lib/songs";
import { correctSlot, isSlotCorrect, slotLabel } from "@/lib/timeline";
import {
  expectAccessible,
  fakePlayer,
  mockClipboard,
  renderIn,
  savedData,
  setupGameTests,
  trackedEvents,
} from "@/test/helpers";

vi.mock("@/lib/youtube", async (original) =>
  (await import("@/test/helpers")).mockYoutube(original as never),
);
setupGameTests();

function today() {
  const t = savedData().timeline;
  return { cards: t.cards, song: getSong(t.today?.songId)! };
}

async function placeAt(slot: number, container: HTMLElement) {
  const { cards } = today();
  await userEvent.click(
    screen.getByRole("button", { name: `+ ${slotLabel(cards, slot, MESSAGES.en.slots)}` }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: `Place it: ${slotLabel(cards, slot, MESSAGES.en.slots)}` }),
  );
  expect(fakePlayer.stop).toHaveBeenCalled();
  const swap = container.querySelector(".deck-swap-flash");
  expect(swap).not.toBeNull();
  fireEvent.animationEnd(swap!);
}

async function shareAndRead() {
  const writeText = mockClipboard();
  await userEvent.click(screen.getByRole("button", { name: "Share result" }));
  await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
  return writeText.mock.calls[0]![0];
}

describe("Daily Timeline screen", () => {
  it("starts a new timeline at a free starting year", () => {
    const { container } = renderIn("en", <TimelineGame />);
    const { cards } = today();
    expect(cards).toHaveLength(1);
    expect(container.textContent).toContain(
      `Day 1 of a new timeline, starting at ${cards[0]!.year}.`,
    );
    expect(container.textContent).toContain("Starting year");
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pick a spot on the timeline" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("grows the timeline on a right guess", async () => {
    const { container } = renderIn("en", <TimelineGame />);
    const { cards, song } = today();
    await placeAt(correctSlot(cards, song.year), container);
    expect(container.textContent).toContain("Nailed it! ✅");
    expect(container.textContent).toContain("Your timeline now has 1 song.");
    // The answer is revealed once placed.
    expect(container.textContent).toContain(song.title);
    expect(screen.queryByRole("button", { name: /^\+/ })).toBeNull();
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
    expect(screen.getAllByRole("button", { name: /^\+/ })).toHaveLength(3);
  });

  it("offers a different song when the video can't play", async () => {
    renderIn("en", <TimelineGame />);
    const { song } = today();
    Object.assign(fakePlayer, { currentId: song.youtubeId, status: "error" });
    // Re-render with the player in its error state.
    const { container } = renderIn("en", <TimelineGame />);
    expect(container.textContent).toContain("This song can't be played here");
    await userEvent.click(screen.getAllByRole("button", { name: "Give me a different song" })[0]!);
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
});

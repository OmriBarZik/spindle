// Each move depends on the previous one, so the loops click one step at a time.
/* oxlint-disable no-await-in-loop */
import { act, fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { MarathonGame } from "@/components/MarathonGame";
import { marathonAnchorYearFor, marathonSongsFor } from "@/lib/daily";
import { marathonCurrent, marathonLine } from "@/lib/marathonState";
import { correctSlot, isSlotCorrect } from "@/lib/timeline";
import { expectAccessible } from "@/test/expectAccessible";
import { trackedEvents } from "@/test/fakeAnalytics";
import { fakeClipboard } from "@/test/fakeClipboard";
import { fakeYouTube } from "@/test/fakeYouTube";
import { moveRecordTo } from "@/test/recordControls";
import { renderIn } from "@/test/renderIn";
import { savedData } from "@/test/savedData";
import { setupGameTests } from "@/test/setupGameTests";

setupGameTests();

const DAY = "2026-11-01";

function placeButton() {
  return screen.getByRole("button", { name: /^Place it: / });
}

/** Place the current song right or wrong, then let the record animation end. */
async function place(right: boolean, container: HTMLElement) {
  const state = savedData().marathon.days[DAY]!;
  const song = marathonCurrent(DAY, state)!;
  const line = marathonLine(state);
  const good = correctSlot(line, song.year);
  const bad = [0, line.length].find((s) => !isSlotCorrect(line, s, song.year))!;
  await moveRecordTo(container, right ? good : bad);
  await userEvent.click(placeButton());
  fireEvent.animationEnd(container.querySelector(".deck-swap")!);
}

function hearts() {
  return screen.getByRole("img", { name: /hearts left$/ }).getAttribute("aria-label");
}

it("starts from the day's starting year with three hearts", () => {
  const { container } = renderIn("en", <MarathonGame />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Marathon");
  expect(container.textContent).toContain(`Your line starts at ${marathonAnchorYearFor(DAY)}`);
  expect(hearts()).toBe("3 of 3 hearts left");
  expect(container.textContent).toContain("Score: 0");
  expect(screen.getByText("Song 1")).toBeTruthy();
  expect(placeButton()).toHaveProperty("disabled", false);
});

it("plays until the third wrong answer, then shows and shares the score", async () => {
  const copied = fakeClipboard();
  const { container } = renderIn("en", <MarathonGame />);
  const songs = marathonSongsFor(DAY);
  const answers = [true, false, true, true, false];
  // Nothing is listed until the run is over, so no song is given away.
  expect(screen.queryByRole("region", { name: "Today's songs" })).toBeNull();
  for (const [i, right] of answers.entries()) {
    await place(right, container);
    expect(container.textContent).toContain(right ? "✅ Correct!" : "❌ Not quite.");
    expect(container.textContent).toContain(`“${songs[i]!.title}” by ${songs[i]!.artist}`);
  }
  expect(hearts()).toBe("1 of 3 hearts left");
  expect(container.textContent).toContain("You lost a heart.");
  expect(container.textContent).toContain("Score: 3");
  expect(screen.getByText("Song 6")).toBeTruthy();

  await place(false, container);
  expect(hearts()).toBe("0 of 3 hearts left");
  expect(container.textContent).toContain("Out of hearts!");
  expect(container.textContent).toContain("3 songs placed right");
  expect(container.querySelector("[data-gap]")).toBeNull();
  expect(savedData().marathon.stats).toEqual({ played: 1, best: 3, totalHits: 3 });

  // Every song of the run, in the order played, links to YouTube.
  const list = screen.getByRole("region", { name: "Today's songs" });
  const items = list.querySelectorAll("li");
  expect(items).toHaveLength(6);
  for (const [i, song] of songs.slice(0, 6).entries()) {
    expect(items[i]!.textContent).toContain(song.title);
    expect(items[i]!.textContent).toContain(String(song.year));
    expect(items[i]!.textContent).toContain(i === 1 || i >= 4 ? "Placed wrong:" : "Placed right:");
    const link = screen.getByRole("link", {
      name: `Watch “${song.title}” on YouTube (opens in a new tab)`,
    });
    expect(link.getAttribute("href")).toBe(`https://www.youtube.com/watch?v=${song.youtubeId}`);
  }

  await userEvent.click(screen.getByRole("button", { name: "Share result" }));
  await vi.waitFor(() =>
    expect(copied).toEqual([
      `Spindle Marathon #1 · 3 🎵\n🟩🟥🟩🟩🟥🟥\n${window.location.origin}/marathon`,
    ]),
  );
});

it("sends analytics events, without song details", async () => {
  const { container } = renderIn("en", <MarathonGame />);
  await userEvent.click(screen.getByRole("button", { name: "Play" }));
  for (const right of [true, false, false, false]) {
    await place(right, container);
  }
  const mode = "marathon";
  expect(trackedEvents()).toEqual([
    ["game_open", { mode, status: "new" }],
    ["song_play", { mode, turn: 1 }],
    ["song_place", { mode, turn: 1, correct: true }],
    ["song_place", { mode, turn: 2, correct: false }],
    ["song_place", { mode, turn: 3, correct: false }],
    ["song_place", { mode, turn: 4, correct: false }],
    ["game_complete", { mode, score: 1 }],
  ]);
  container.remove();
  renderIn("en", <MarathonGame />);
  expect(trackedEvents().at(-1)).toEqual(["game_open", { mode, status: "done" }]);
});

it("restores a run in progress", async () => {
  const first = renderIn("en", <MarathonGame />);
  await place(false, first.container);
  first.unmount();
  const { container } = renderIn("en", <MarathonGame />);
  expect(hearts()).toBe("2 of 3 hearts left");
  expect(screen.getByText("Song 2")).toBeTruthy();
  expect(container.querySelectorAll("[data-gap]")).toHaveLength(3);
});

it("offers a different song when the video can't play", async () => {
  const { container } = renderIn("en", <MarathonGame />);
  const [first, second] = marathonSongsFor(DAY);
  await userEvent.click(screen.getByRole("button", { name: "Play" }));
  act(() => fakeYouTube.failVideo());
  expect(container.textContent).toContain("This song can't be played here");
  await userEvent.click(screen.getByRole("button", { name: "Give me a different song" }));
  const state = savedData().marathon.days[DAY]!;
  expect(state.skipped).toEqual([first!.id]);
  expect(marathonCurrent(DAY, state)?.id).toBe(second!.id);
  expect(hearts()).toBe("3 of 3 hearts left");
  expect(trackedEvents().at(-1)).toEqual(["song_skip", { mode: "marathon" }]);
});

it("has no accessibility violations, in both languages and when done", async () => {
  const en = renderIn("en", <MarathonGame />);
  await expectAccessible(en.container);
  for (const right of [true, false, false, false]) {
    await place(right, en.container);
  }
  await expectAccessible(en.container);
  en.unmount();
  const he = renderIn("he", <MarathonGame />);
  await expectAccessible(he.container);
});

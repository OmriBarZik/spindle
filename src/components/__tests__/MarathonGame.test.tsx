// Each move depends on the previous one, so the loops click one step at a time.
/* oxlint-disable no-await-in-loop */
import { act, fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { MarathonGame } from "@/components/MarathonGame";
import { marathonAnchorYearFor, marathonSongsFor } from "@/lib/daily";
import { marathonRun } from "@/lib/marathonFree";
import { marathonCurrent, marathonLine } from "@/lib/marathonState";
import { correctSlot, isSlotCorrect } from "@/lib/timeline";
import { expectAccessible } from "@/test/expectAccessible";
import { trackedEvents } from "@/test/fakeAnalytics";
import { fakeClipboard } from "@/test/fakeClipboard";
import { fakeYouTube } from "@/test/fakeYouTube";
import { moveRecordTo, playSong } from "@/test/recordControls";
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
  const { state } = marathonRun(savedData(), DAY)!;
  const song = marathonCurrent(DAY, state)!;
  const line = marathonLine(state);
  const good = correctSlot(line, song.year);
  const bad = [0, line.length].find((s) => !isSlotCorrect(line, s, song.year))!;
  await playSong();
  await moveRecordTo(container, right ? good : bad);
  await userEvent.click(placeButton());
  fireEvent.animationEnd(container.querySelector(".deck-swap")!);
}

function hearts() {
  return screen.getByRole("img", { name: /hearts left$/ }).getAttribute("aria-label");
}

it("starts from the day's starting year with three hearts", async () => {
  const { container } = renderIn("en", <MarathonGame />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Marathon");
  expect(container.textContent).toContain(`Your line starts at ${marathonAnchorYearFor(DAY)}`);
  expect(hearts()).toBe("3 of 3 hearts left");
  expect(container.textContent).toContain("Score: 0");
  expect(screen.getByText("Song 1")).toBeTruthy();
  // The song can be placed once it has been played.
  const unheard = screen.getByRole("button", { name: "Play the song to place it" });
  expect(unheard).toHaveProperty("disabled", true);
  await playSong();
  expect(placeButton()).toHaveProperty("disabled", false);
});

it("plays until the third wrong answer, then shows and shares the score", async () => {
  const copied = fakeClipboard();
  const { container } = renderIn("en", <MarathonGame />);
  const songs = marathonSongsFor(DAY);
  const answers = [true, false, true, true, false];
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

  // Every song of the run is a card on the line, with a link to watch it on YouTube.
  const line = screen.getByRole("group", { name: /^Your timeline/ });
  for (const song of songs.slice(0, 6)) {
    expect(line.textContent).toContain(song.title);
    const card = [...line.querySelectorAll("li")].find((li) => li.textContent.includes(song.title));
    const watch = card?.querySelector("a");
    expect(watch?.getAttribute("href")).toBe(`https://www.youtube.com/watch?v=${song.youtubeId}`);
  }
  // Earlier / Later step through the cards freely.
  line.scrollLeft = 0;
  await userEvent.click(screen.getByRole("button", { name: "Later" }));
  await vi.waitFor(() => expect(line.scrollLeft).toBeGreaterThan(100));
  const after = line.scrollLeft;
  await userEvent.click(screen.getByRole("button", { name: "Earlier" }));
  await vi.waitFor(() => expect(line.scrollLeft).toBeLessThan(after));

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
    ["song_play", { mode, turn: 2 }],
    ["song_place", { mode, turn: 2, correct: false }],
    ["song_play", { mode, turn: 3 }],
    ["song_place", { mode, turn: 3, correct: false }],
    ["song_play", { mode, turn: 4 }],
    ["song_place", { mode, turn: 4, correct: false }],
    ["game_complete", { mode, score: 1, free_play: false }],
  ]);
  container.remove();
  renderIn("en", <MarathonGame />);
  expect(trackedEvents().at(-1)).toEqual(["game_open", { mode, status: "done" }]);
});

it("plays again after the day's run, as free play that doesn't count", async () => {
  const copied = fakeClipboard();
  const { container } = renderIn("en", <MarathonGame />);
  for (const right of [false, false, false]) {
    await place(right, container);
  }
  const stats = savedData().marathon.stats;
  await userEvent.click(screen.getByRole("button", { name: "Play again" }));
  expect(container.textContent).toContain("Free play, just for fun");
  expect(hearts()).toBe("3 of 3 hearts left");
  expect(screen.getByText("Song 1")).toBeTruthy();
  expect(savedData().marathon.free?.day).toBe(DAY);

  for (const right of [true, false, false, false]) {
    await place(right, container);
  }
  expect(container.textContent).toContain("1 song placed right");
  expect(savedData().marathon.stats).toEqual(stats);
  expect(savedData().marathon.days[DAY]!.placements).toHaveLength(3);
  await userEvent.click(screen.getByRole("button", { name: "Challenge a friend" }));
  const seed = savedData().marathon.free!.seed;
  await vi.waitFor(() =>
    expect(copied).toEqual([
      `Spindle Marathon · Free play · 1 🎵\n🟩🟥🟥🟥\nSame songs. Can you beat my 1? 🎯\n${window.location.origin}/marathon?run=${seed}&beat=1`,
    ]),
  );
  expect(trackedEvents()).toContainEqual(["play_again", { mode: "marathon" }]);
  expect(trackedEvents()).toContainEqual([
    "game_complete",
    { mode: "marathon", score: 1, free_play: true },
  ]);
  await expectAccessible(container);

  // Again and again: each run starts fresh.
  await userEvent.click(screen.getByRole("button", { name: "Play again" }));
  expect(hearts()).toBe("3 of 3 hearts left");
  expect(container.textContent).toContain("Score: 0");
});

it("opens a friend's challenge link: their songs, their score to beat", async () => {
  const seed = `${DAY}_friend`;
  window.history.replaceState(null, "", `/en/marathon?run=${seed}&beat=1`);
  const { container } = renderIn("en", <MarathonGame />);
  expect(container.textContent).toContain("Challenge: a friend placed 1 of these songs right");
  expect(savedData().marathon.free).toMatchObject({ seed, beat: 1, placements: [] });
  // The link is used up, so a reload after "Play again" won't bring it back.
  expect(window.location.search).toBe("");
  expect(trackedEvents()).toContainEqual(["challenge_open", { mode: "marathon" }]);

  for (const right of [true, true, false, false, false]) {
    await place(right, container);
  }
  expect(container.textContent).toContain("You beat your friend's 1! 🏆");
  await expectAccessible(container);
  // The day's own run is still waiting.
  expect(savedData().marathon.days[DAY]!.placements).toEqual([]);
  await userEvent.click(screen.getByRole("button", { name: "Play today's marathon" }));
  expect(container.textContent).toContain(`Your line starts at ${marathonAnchorYearFor(DAY)}`);
  expect(hearts()).toBe("3 of 3 hearts left");
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

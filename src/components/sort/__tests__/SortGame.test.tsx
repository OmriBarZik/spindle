// Each move depends on the previous one, so the loops click one step at a time.
/* oxlint-disable no-await-in-loop */
import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { SortGame } from "@/components/sort/SortGame";
import { MESSAGES } from "@/i18n/messages";
import { anchorYearFor, sortSongsFor } from "@/lib/catalog/daily";
import { getSong } from "@/lib/catalog/songs";
import { correctSlot, slotLabel } from "@/lib/line/timeline";
import { holdPlayer } from "@/lib/services/player";
import { expectAccessible } from "@/test/expectAccessible";
import { trackedEvents } from "@/test/fakes/fakeAnalytics";
import { fakeClipboard } from "@/test/fakes/fakeClipboard";
import { fakeYouTube } from "@/test/fakes/fakeYouTube";
import { moveRecordTo, playSong, recordGap } from "@/test/input/recordControls";
import { renderIn } from "@/test/renderIn";
import { savedData } from "@/test/savedData";
import { setupGameTests } from "@/test/setupGameTests";

setupGameTests();

const DAY = "2026-11-01";

/** The line as the player sees it, rebuilt from the save. */
function currentLine(): { year: number }[] {
  const d = savedData().sort.days[DAY]!;
  const line: { year: number }[] = [{ year: d.anchorYear }];
  for (const [i, p] of d.placements.entries()) {
    const year = getSong(d.songIds[i])!.year;
    line.splice(p.correct ? p.slot : correctSlot(line, year), 0, { year });
  }
  return line;
}

function placeButton() {
  return screen.getByRole("button", { name: /^Place it: / });
}

/** Place song `i` (0-based) right or wrong, then let the record animation end. */
async function place(i: number, right: boolean, container: HTMLElement) {
  const line = currentLine();
  const year = sortSongsFor(DAY)[i]!.year;
  const good = correctSlot(line, year);
  const bad = good === 0 ? line.length : 0;
  const slot = right ? good : bad;
  await playSong();
  await moveRecordTo(container, slot);
  // The button says where the song goes; its name adds the action.
  const where = slotLabel(line, slot, MESSAGES.en.placeAt);
  expect(placeButton().textContent).toBe(where);
  expect(placeButton().getAttribute("aria-label")).toBe(`Place it: ${where}`);
  await userEvent.click(placeButton());
  expect(fakeYouTube.stops).toBeGreaterThan(0);
  // Locked until the record's result animation ends (the last song has no button left).
  const locked = screen.queryByRole("button", { name: /^Place it: / });
  expect(locked?.hasAttribute("disabled") ?? true).toBe(true);
  const swap = container.querySelector(".deck-swap");
  expect(swap).not.toBeNull();
  fireEvent.animationEnd(swap!);
  expect(container.querySelector(".deck-swap")).toBeNull();
}

it("starts from the day's starting year with two gaps", async () => {
  const { container } = renderIn("en", <SortGame />);
  const year = anchorYearFor(DAY);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Daily Five");
  expect(container.textContent).toContain(`Your line starts at ${year}`);
  expect(container.querySelectorAll("[data-gap]")).toHaveLength(2);
  // No placing a song before hearing it: the button asks for a play first.
  const unheard = screen.getByRole("button", { name: "Play the song to place it" });
  expect(unheard).toHaveProperty("disabled", true);
  await userEvent.keyboard("{Enter}");
  expect(savedData().sort.days[DAY]?.placements).toHaveLength(0);
  await playSong();
  // The record starts on a gap, so the button is ready to answer.
  expect(placeButton().textContent).toBe(`After ${year}`);
  expect(placeButton()).toHaveProperty("disabled", false);
  await moveRecordTo(container, 0);
  expect(placeButton().textContent).toBe(`Before ${year}`);
  expect(screen.getByRole("button", { name: "Earlier" })).toHaveProperty("disabled", true);
  expect(screen.getByText("Song 1 of 5")).toBeTruthy();
});

it("plays a whole day, revealing each song and keeping score", async () => {
  const copied = fakeClipboard();
  const { container } = renderIn("en", <SortGame />);
  const songs = sortSongsFor(DAY);
  const right = [true, false, true, true, false];

  for (let i = 0; i < 4; i++) {
    await place(i, right[i]!, container);
    expect(container.textContent).toContain(right[i]! ? "✅ Correct!" : "❌ Not quite.");
    expect(container.textContent).toContain(`“${songs[i]!.title}” by ${songs[i]!.artist}`);
  }
  await place(4, right[4]!, container);

  expect(container.textContent).toContain("3 / 5 placed right");
  expect(container.textContent).toContain("🟩🟥🟩🟩🟥");
  // Wrong songs are shown red at their real spot, with no extra label.
  expect(container.querySelectorAll(".card-bad")).toHaveLength(2);
  expect(container.querySelector("[data-gap]")).toBeNull();
  expect(savedData().sort.stats.played).toBe(1);

  await userEvent.click(screen.getByRole("button", { name: "Share result" }));
  await vi.waitFor(() =>
    expect(copied).toEqual([`Spindle Daily Five 3/5\n🟩🟥🟩🟩🟥\n${window.location.origin}/sort`]),
  );
  await screen.findByRole("button", { name: "Copied!" });
});

it("sends analytics events through the day, without song details", async () => {
  fakeClipboard();
  const { container } = renderIn("en", <SortGame />);
  await userEvent.click(screen.getByRole("button", { name: "Play" }));
  for (let i = 0; i < 5; i++) {
    await place(i, i !== 1, container);
  }
  await userEvent.click(screen.getByRole("button", { name: "Share result" }));
  await vi.waitFor(() => expect(trackedEvents().at(-1)?.[0]).toBe("share"));

  const mode = "daily_five";
  expect(trackedEvents()).toEqual([
    ["game_open", { mode, status: "new" }],
    ["song_play", { mode, turn: 1 }],
    ["song_place", { mode, turn: 1, correct: true }],
    ["song_play", { mode, turn: 2 }],
    ["song_place", { mode, turn: 2, correct: false }],
    ["song_play", { mode, turn: 3 }],
    ["song_place", { mode, turn: 3, correct: true }],
    ["song_play", { mode, turn: 4 }],
    ["song_place", { mode, turn: 4, correct: true }],
    ["song_play", { mode, turn: 5 }],
    ["song_place", { mode, turn: 5, correct: true }],
    ["game_complete", { mode, score: 4, total: 5, perfect: false }],
    ["share", { content_type: mode, method: "copied" }],
  ]);
  // Reopening a finished day says so.
  container.remove();
  renderIn("en", <SortGame />);
  expect(trackedEvents().at(-1)).toEqual(["game_open", { mode, status: "done" }]);
});

it("tags the share text when the puzzle used one kind of song", async () => {
  window.localStorage.setItem(
    "spindle:v1",
    JSON.stringify({ version: 1, settings: { songLanguages: ["he"] } }),
  );
  const copied = fakeClipboard();
  const { container } = renderIn("he", <SortGame />);
  const songs = sortSongsFor(DAY, ["he"]);
  // Hebrew pages show Hebrew names.
  for (let i = 0; i < 5; i++) {
    const line = currentLine();
    const slot = correctSlot(line, songs[i]!.year);
    await playSong("he");
    await moveRecordTo(container, slot, "he");
    await userEvent.click(screen.getByRole("button", { name: /^לשבץ/ }));
    fireEvent.animationEnd(container.querySelector(".deck-swap")!);
  }
  expect(container.textContent).toContain("מושלם! 🎉");
  await userEvent.click(screen.getByRole("button", { name: "שיתוף התוצאה" }));
  await vi.waitFor(() =>
    expect(copied).toEqual([
      `Spindle החמישייה היומית 5/5 · רק שירים ישראליים\n🟩🟩🟩🟩🟩\n${window.location.origin}/sort`,
    ]),
  );
  expect(container.textContent).toContain(songs[0]!.titleHe);
});

it("restores a day in progress", async () => {
  const first = renderIn("en", <SortGame />);
  await place(0, true, first.container);
  first.unmount();
  const { container } = renderIn("en", <SortGame />);
  expect(screen.getByText("Song 2 of 5")).toBeTruthy();
  expect(container.querySelectorAll("[data-gap]")).toHaveLength(3);
});

it("announces each result to screen readers", async () => {
  const { container } = renderIn("en", <SortGame />);
  const status = () =>
    screen
      .getAllByRole("status")
      .map((el) => el.textContent)
      .join("|");
  await place(0, true, container);
  expect(status()).toContain("✅ Correct!");
  await place(1, false, container);
  expect(status()).toContain("❌ Not quite.");
});

it("moves the record with the arrow keys, with nothing focused", async () => {
  const { container } = renderIn("en", <SortGame />);
  const year = anchorYearFor(DAY);
  await playSong();
  await userEvent.keyboard("{ArrowLeft}");
  expect(placeButton().textContent).toBe(`Before ${year}`);
  await userEvent.keyboard("{ArrowRight}");
  expect(placeButton().textContent).toBe(`After ${year}`);
  await userEvent.keyboard("{Home}");
  expect(recordGap(container)).toBe(0);
  await userEvent.keyboard("{End}");
  expect(recordGap(container)).toBe(1);
});

it("swaps the arrow keys on right-to-left pages", async ({ onTestFinished }) => {
  document.documentElement.dir = "rtl";
  onTestFinished(() => {
    document.documentElement.removeAttribute("dir");
  });
  const { container } = renderIn("he", <SortGame />);
  await userEvent.keyboard("{Home}");
  await userEvent.keyboard("{ArrowLeft}");
  expect(recordGap(container)).toBe(1);
  await userEvent.keyboard("{ArrowRight}");
  expect(recordGap(container)).toBe(0);
});

it("leaves the browser's own arrow shortcuts alone", async () => {
  const { container } = renderIn("en", <SortGame />);
  await userEvent.keyboard("{Home}");
  await userEvent.keyboard("{Alt>}{ArrowRight}{/Alt}");
  expect(recordGap(container)).toBe(0);
});

it("ignores the arrow keys while the answer is showing", async () => {
  const { container } = renderIn("en", <SortGame />);
  await playSong();
  await userEvent.click(placeButton());
  const before = recordGap(container);
  await userEvent.keyboard("{ArrowLeft}");
  await userEvent.keyboard("{ArrowRight}");
  expect(recordGap(container)).toBe(before);
  fireEvent.animationEnd(container.querySelector(".deck-swap")!);
});

it("shows where the song really went while the record glows", async () => {
  const { container } = renderIn("en", <SortGame />);
  const year = sortSongsFor(DAY)[0]!.year;
  const slot = correctSlot(currentLine(), year);
  await playSong();
  await moveRecordTo(container, slot === 0 ? 1 : 0);
  await userEvent.click(placeButton());
  // The answer sits beside the record, and the choosing glow is gone.
  expect(container.querySelector(".swipe-gap-on")).toBeNull();
  expect(container.querySelector(".swipe-lit")).toBeNull();
  expect(container.querySelector(".card-bad")).not.toBeNull();
  fireEvent.animationEnd(container.querySelector(".deck-swap")!);
  expect(container.querySelector(".swipe-gap-on")).not.toBeNull();
});

it("keeps the song playing through language switches, back and forth", async () => {
  let page = renderIn("en", <SortGame />);
  await playSong();
  for (const lang of ["he", "en", "he", "en"] as const) {
    // What the language switch does as it's clicked; then the page remounts.
    holdPlayer();
    page.unmount();
    page = renderIn(lang, <SortGame />);
    const { pause, placeIt } = MESSAGES[lang].common;
    expect(screen.getByRole("button", { name: pause })).toBeTruthy();
    const button = screen.getByRole("button", { name: new RegExp(`^${placeIt("")}`) });
    expect(button).toHaveProperty("disabled", false);
  }
  // One player the whole time: the song was loaded once and never stopped.
  expect(fakeYouTube.loads).toBe(1);
  expect(fakeYouTube.destroys).toBe(0);
});

it("still lets a paused song be placed after a language switch", async () => {
  const en = renderIn("en", <SortGame />);
  await playSong();
  await userEvent.click(screen.getByRole("button", { name: "Pause" }));
  holdPlayer();
  en.unmount();
  renderIn("he", <SortGame />);
  expect(screen.getByRole("button", { name: "נגינה" })).toHaveProperty("disabled", false);
  expect(screen.getByRole("button", { name: /^לשבץ: / })).toHaveProperty("disabled", false);
});

it("stops the song when the player leaves the game", async () => {
  const page = renderIn("en", <SortGame />);
  await playSong();
  page.unmount();
  await vi.waitFor(() => expect(fakeYouTube.destroys).toBe(1));
  expect(document.querySelector(".player-host")).toBeNull();
});

it("keeps the hidden YouTube player out of sight and out of reach", () => {
  const { container } = renderIn("en", <SortGame />);
  // On <body>, outside the page, so it outlives a language switch.
  const host = document.querySelector<HTMLElement>(".player-host")!;
  expect(container.contains(host)).toBe(false);
  expect(host.inert).toBe(true);
  expect(host.getAttribute("aria-hidden")).toBe("true");
  expect(getComputedStyle(host).opacity).toBe("0");
  expect(getComputedStyle(host).pointerEvents).toBe("none");
});

it("has no accessibility violations, in both languages and when done", async () => {
  const en = renderIn("en", <SortGame />);
  await expectAccessible(en.container);
  for (let i = 0; i < 5; i++) {
    await place(i, i % 2 === 0, en.container);
  }
  await expectAccessible(en.container);
  en.unmount();
  const he = renderIn("he", <SortGame />);
  await expectAccessible(he.container);
});

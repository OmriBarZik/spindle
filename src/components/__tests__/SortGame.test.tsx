// Each move depends on the previous one, so the loops click one step at a time.
/* oxlint-disable no-await-in-loop */
import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { SortGame } from "@/components/SortGame";
import { MESSAGES } from "@/i18n/messages";
import { anchorYearFor, sortSongsFor } from "@/lib/daily";
import { getSong } from "@/lib/songs";
import { correctSlot, slotLabel } from "@/lib/timeline";
import { expectAccessible } from "@/test/expectAccessible";
import { trackedEvents } from "@/test/fakeAnalytics";
import { fakeClipboard } from "@/test/fakeClipboard";
import { fakeYouTube } from "@/test/fakeYouTube";
import { moveRecordTo, recordGap } from "@/test/recordControls";
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
  expect(container.textContent).toContain("moved here");
  expect(container.querySelector("[data-gap]")).toBeNull();
  expect(savedData().sort.stats.played).toBe(1);

  await userEvent.click(screen.getByRole("button", { name: "Share result" }));
  await vi.waitFor(() =>
    expect(copied).toEqual([
      `Spindle Daily Five #1 3/5\n🟩🟥🟩🟩🟥\n${window.location.origin}/sort`,
    ]),
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
    ["song_place", { mode, turn: 2, correct: false }],
    ["song_place", { mode, turn: 3, correct: true }],
    ["song_place", { mode, turn: 4, correct: true }],
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
    await moveRecordTo(container, slot, "he");
    await userEvent.click(screen.getByRole("button", { name: /^לשבץ/ }));
    fireEvent.animationEnd(container.querySelector(".deck-swap")!);
  }
  expect(container.textContent).toContain("מושלם! 🎉");
  await userEvent.click(screen.getByRole("button", { name: "שיתוף התוצאה" }));
  await vi.waitFor(() =>
    expect(copied).toEqual([
      `Spindle החמישייה היומית #1 5/5 · רק שירים ישראליים\n🟩🟩🟩🟩🟩\n${window.location.origin}/sort`,
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

it("moves the record with the arrow keys on the line", async () => {
  const { container } = renderIn("en", <SortGame />);
  const year = anchorYearFor(DAY);
  const line = screen.getByRole("group", { name: /^Your timeline/ });
  line.focus();
  await userEvent.keyboard("{ArrowLeft}");
  expect(placeButton().textContent).toBe(`Before ${year}`);
  await userEvent.keyboard("{End}");
  expect(placeButton().textContent).toBe(`After ${year}`);
  expect(recordGap(container)).toBe(1);
});

it("shows where the song really went while the record glows", async () => {
  const { container } = renderIn("en", <SortGame />);
  const year = sortSongsFor(DAY)[0]!.year;
  const slot = correctSlot(currentLine(), year);
  await moveRecordTo(container, slot === 0 ? 1 : 0);
  await userEvent.click(placeButton());
  // The answer sits beside the record, and the choosing glow is gone.
  expect(container.querySelector(".swipe-gap-on")).toBeNull();
  expect(container.querySelector(".swipe-lit")).toBeNull();
  expect(container.querySelector(".card-bad")).not.toBeNull();
  fireEvent.animationEnd(container.querySelector(".deck-swap")!);
  expect(container.querySelector(".swipe-gap-on")).not.toBeNull();
});

it("keeps the hidden YouTube player out of reach", () => {
  const { container } = renderIn("en", <SortGame />);
  const host = container.querySelector("[inert]");
  expect(host?.getAttribute("aria-hidden")).toBe("true");
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

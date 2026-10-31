// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SortGame from "@/components/SortGame";
import { MESSAGES } from "@/i18n/messages";
import { anchorYearFor, sortSongsFor } from "@/lib/daily";
import { getSong } from "@/lib/songs";
import { correctSlot, slotLabel } from "@/lib/timeline";
import { expectAccessible, fakePlayer, renderIn, savedData, setupGameTests } from "@/test/helpers";

vi.mock("@/lib/youtube", async (original) =>
  (await import("@/test/helpers")).mockYoutube(original as never),
);
setupGameTests();

const DAY = "2026-11-01";

/** The line as the player sees it, rebuilt from the save. */
function currentLine(): { year: number }[] {
  const d = savedData().sort.days[DAY]!;
  const line: { year: number }[] = [{ year: d.anchorYear }];
  d.placements.forEach((p, i) => {
    const year = getSong(d.songIds[i])!.year;
    line.splice(p.correct ? p.slot : correctSlot(line, year), 0, { year });
  });
  return line;
}

function placeButton() {
  return screen.getByRole("button", { name: /^(Pick a spot|Place it)/ });
}

/** Place song `i` (0-based) right or wrong, then let the record animation end. */
function place(i: number, right: boolean, container: HTMLElement) {
  const line = currentLine();
  const year = sortSongsFor(DAY)[i]!.year;
  const good = correctSlot(line, year);
  const slot = right ? good : good === 0 ? line.length : 0;
  fireEvent.click(
    screen.getByRole("button", { name: `+ ${slotLabel(line, slot, MESSAGES.en.slots)}` }),
  );
  expect(placeButton()).toHaveProperty(
    "textContent",
    `Place it: ${slotLabel(line, slot, MESSAGES.en.slots)}`,
  );
  fireEvent.click(placeButton());
  expect(fakePlayer.stop).toHaveBeenCalled();
  // Locked until the record's result animation ends (the last song has no button left).
  const locked = screen.queryByRole("button", { name: /^(Pick a spot|Place it)/ });
  if (locked) expect(locked).toHaveProperty("disabled", true);
  const swap = container.querySelector(".deck-swap");
  expect(swap).not.toBeNull();
  fireEvent.animationEnd(swap!);
  expect(container.querySelector(".deck-swap")).toBeNull();
}

describe("Daily Five screen", () => {
  it("starts from the day's starting year with two gaps", () => {
    const { container } = renderIn("en", <SortGame />);
    const year = anchorYearFor(DAY);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Daily Five");
    expect(container.textContent).toContain(`Your line starts at ${year}`);
    expect(screen.getByRole("button", { name: `+ Before ${year}` })).toBeTruthy();
    expect(screen.getByRole("button", { name: `+ After ${year}` })).toBeTruthy();
    expect(placeButton()).toHaveProperty("disabled", true);
    expect(screen.getByText("Song 1 of 5")).toBeTruthy();
  });

  it("plays a whole day, revealing each song and keeping score", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { container } = renderIn("en", <SortGame />);
    const songs = sortSongsFor(DAY);
    const right = [true, false, true, true, false];

    for (let i = 0; i < 5; i++) {
      place(i, right[i]!, container);
      if (i < 4) {
        expect(container.textContent).toContain(right[i]! ? "✅ Correct!" : "❌ Not quite.");
        expect(container.textContent).toContain(`“${songs[i]!.title}” by ${songs[i]!.artist}`);
      }
    }

    expect(container.textContent).toContain("3 / 5 placed right");
    expect(container.textContent).toContain("🟩🟥🟩🟩🟥");
    expect(container.textContent).toContain("moved here");
    expect(screen.queryByRole("button", { name: /^\+/ })).toBeNull();
    expect(savedData().sort.stats.played).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Share result" }));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText).toHaveBeenCalledWith(
      `Spindle Daily Five #1 3/5\n🟩🟥🟩🟩🟥\n${window.location.origin}`,
    );
    await screen.findByRole("button", { name: "Copied!" });
  });

  it("tags the share text when the puzzle used one kind of song", async () => {
    window.localStorage.setItem(
      "spindle:v1",
      JSON.stringify({ version: 1, settings: { songLanguages: ["he"] } }),
    );
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { container } = renderIn("he", <SortGame />);
    const songs = sortSongsFor(DAY, ["he"]);
    // Hebrew pages show Hebrew names.
    for (let i = 0; i < 5; i++) {
      const line = currentLine();
      const slot = correctSlot(line, songs[i]!.year);
      const slots = screen.getAllByRole("button").filter((b) => b.textContent.startsWith("+ "));
      fireEvent.click(slots[slot]!);
      fireEvent.click(screen.getByRole("button", { name: /^לשבץ/ }));
      fireEvent.animationEnd(container.querySelector(".deck-swap")!);
    }
    expect(container.textContent).toContain("מושלם! 🎉");
    fireEvent.click(screen.getByRole("button", { name: "שיתוף התוצאה" }));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText).toHaveBeenCalledWith(
      `Spindle החמישייה היומית #1 5/5 · רק שירים ישראליים\n🟩🟩🟩🟩🟩\n${window.location.origin}`,
    );
    expect(container.textContent).toContain(songs[0]!.titleHe);
  });

  it("restores a day in progress", () => {
    const first = renderIn("en", <SortGame />);
    place(0, true, first.container);
    first.unmount();
    renderIn("en", <SortGame />);
    expect(screen.getByText("Song 2 of 5")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^\+/ })).toHaveLength(3);
  });

  it("announces each result to screen readers", () => {
    const { container } = renderIn("en", <SortGame />);
    const status = () =>
      screen
        .getAllByRole("status")
        .map((el) => el.textContent)
        .join("|");
    place(0, true, container);
    expect(status()).toContain("✅ Correct!");
    place(1, false, container);
    expect(status()).toContain("❌ Not quite.");
  });

  it("keeps the hidden YouTube player out of reach", () => {
    const { container } = renderIn("en", <SortGame />);
    const host = container.querySelector("[inert]");
    expect(host?.getAttribute("aria-hidden")).toBe("true");
  });

  it("has no accessibility violations, in both languages and when done", async () => {
    const en = renderIn("en", <SortGame />);
    await expectAccessible(en.container);
    for (let i = 0; i < 5; i++) place(i, i % 2 === 0, en.container);
    await expectAccessible(en.container);
    en.unmount();
    const he = renderIn("he", <SortGame />);
    await expectAccessible(he.container);
  });
});

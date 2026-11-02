import { expect, it } from "vitest";
import { MESSAGES } from "@/i18n/messages";
import type { MarathonDay, SortDay } from "@/lib/saveData";
import { marathonShareText, sortShareText } from "@/lib/share";

const ORIGIN = "https://spindle.example";
const day = (correct: boolean[], languages?: SortDay["languages"]): SortDay => ({
  anchorYear: 1990,
  songIds: ["a", "b", "c", "d", "e"],
  placements: correct.map((c) => ({ slot: 0, correct: c })),
  languages,
});

it("formats a Daily Five result", () => {
  expect(
    sortShareText(MESSAGES.en, "2026-11-03", day([true, false, true, true, true]), ORIGIN),
  ).toBe(`Spindle Daily Five #3 4/5\n🟩🟥🟩🟩🟩\n${ORIGIN}/sort`);
  expect(
    sortShareText(MESSAGES.en, "2026-11-01", day([true, true, true, true, true], ["en"]), ORIGIN),
  ).toBe(`Spindle Daily Five #1 5/5 · International songs only\n🟩🟩🟩🟩🟩\n${ORIGIN}/sort`);
  // Both kinds on (or an old save without languages) adds no tag.
  expect(sortShareText(MESSAGES.en, "2026-11-01", day([], ["en", "he"]), ORIGIN)).toBe(
    `Spindle Daily Five #1 0/5\n\n${ORIGIN}/sort`,
  );
});

const marathon = (correct: boolean[], languages: MarathonDay["languages"]): MarathonDay => ({
  anchorYear: 1990,
  languages,
  placements: correct.map((c, i) => ({ songId: String(i), slot: 0, correct: c })),
  skipped: [],
});

it("formats a Marathon result, ten squares a row", () => {
  const twelve = [...Array.from({ length: 10 }, () => true), false, false];
  expect(
    marathonShareText(
      MESSAGES.en,
      "2026-11-02",
      marathon([true, false, true, false, false], ["en", "he"]),
      ORIGIN,
    ),
  ).toBe(`Spindle Marathon #2 · 2 🎵\n🟩🟥🟩🟥🟥\n${ORIGIN}/marathon`);
  expect(marathonShareText(MESSAGES.en, "2026-11-01", marathon(twelve, ["he"]), ORIGIN)).toBe(
    `Spindle Marathon #1 · 10 🎵 · Israeli songs only\n${"🟩".repeat(10)}\n🟥🟥\n${ORIGIN}/marathon`,
  );
  expect(
    marathonShareText(
      MESSAGES.he,
      "2026-11-01",
      marathon([false, false, false], ["en", "he"]),
      ORIGIN,
    ),
  ).toBe(`Spindle מרתון #1 · 0 🎵\n🟥🟥🟥\n${ORIGIN}/marathon`);
});

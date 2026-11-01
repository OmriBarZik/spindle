import { describe, expect, it } from "vitest";
import { MESSAGES } from "@/i18n/messages";
import { sortShareText, timelineShareText } from "../share";
import type { SortDay } from "../storage";

const ORIGIN = "https://spindle.example";
const day = (correct: boolean[], languages?: SortDay["languages"]): SortDay => ({
  anchorYear: 1990,
  songIds: ["a", "b", "c", "d", "e"],
  placements: correct.map((c) => ({ slot: 0, correct: c })),
  languages,
});

describe("share text", () => {
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

  it("formats a Daily Timeline result", () => {
    expect(timelineShareText(MESSAGES.en, "2026-11-02", 3, false, ["en", "he"], ORIGIN)).toBe(
      `Spindle Timeline #2\n🔥 3 songs and counting\n🟩🟩🟩\n${ORIGIN}/timeline`,
    );
    expect(timelineShareText(MESSAGES.en, "2026-11-02", 1, true, ["he"], ORIGIN)).toBe(
      `Spindle Timeline #2 · Israeli songs only\n❌ Timeline ended at 1 song\n🟩🟥\n${ORIGIN}/timeline`,
    );
    expect(timelineShareText(MESSAGES.he, "2026-11-01", 0, true, ["en", "he"], ORIGIN)).toBe(
      `Spindle ציר הזמן #1\n❌ ציר הזמן נגמר אחרי 0 שירים\n🟥\n${ORIGIN}/timeline`,
    );
  });
});

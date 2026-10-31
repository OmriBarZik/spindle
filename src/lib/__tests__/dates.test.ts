import { describe, expect, it } from "vitest";
import { addDays, dayKey, puzzleNumber } from "../dates";

describe("dates", () => {
  it("formats the local calendar day", () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(dayKey(new Date(2026, 11, 31, 0, 0))).toBe("2026-12-31");
  });

  it("adds days across month, year and leap-day boundaries", () => {
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(addDays("2026-11-01", 0)).toBe("2026-11-01");
  });

  it("numbers puzzles from launch day", () => {
    expect(puzzleNumber("2026-11-01")).toBe(1);
    expect(puzzleNumber("2026-11-02")).toBe(2);
    expect(puzzleNumber("2027-11-01")).toBe(366);
    expect(puzzleNumber("2026-10-31")).toBe(0);
  });
});

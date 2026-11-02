import { expect, it } from "vitest";
import { placeSortSong, ensureSortDay } from "@/lib/sortState";
import { emptySave } from "@/lib/storage";
import { dayDate, recentDays } from "@/lib/week";

it("week: lists the last seven days, ending today, with the days a game was started", () => {
  let d = ensureSortDay(emptySave(), "2026-10-30");
  d = placeSortSong(d, "2026-10-30", 0);
  // Opening a game without placing a song doesn't count.
  d = ensureSortDay(d, "2026-11-01");
  expect(recentDays(d, "2026-11-02")).toEqual([
    { day: "2026-10-27", played: false },
    { day: "2026-10-28", played: false },
    { day: "2026-10-29", played: false },
    { day: "2026-10-30", played: true },
    { day: "2026-10-31", played: false },
    { day: "2026-11-01", played: false },
    { day: "2026-11-02", played: false },
  ]);
});

it("week: reads a day key as that local date", () => {
  const date = dayDate("2026-11-02");
  expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 10, 2]);
});

import { addDays } from "./dates";
import type { SaveData } from "./saveData";

/** Days in the home page's "This week" strip. */
const WEEK = 7;

/** Whether any game was started on `day`. */
function playedOn(data: SaveData, day: string): boolean {
  const five = data.sort.days[day]?.placements.length ?? 0;
  const marathon = data.marathon.days[day]?.placements.length ?? 0;
  return five + marathon > 0;
}

/** The last seven days, oldest first and ending today, and whether each was played. */
export function recentDays(data: SaveData, today: string): { day: string; played: boolean }[] {
  return Array.from({ length: WEEK }, (_, i) => {
    const day = addDays(today, i - (WEEK - 1));
    return { day, played: playedOn(data, day) };
  });
}

/** A day key as a Date at local noon (safe from daylight-saving edges). */
export function dayDate(day: string): Date {
  const [y = 0, m = 1, d = 1] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

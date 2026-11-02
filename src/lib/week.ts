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

/** A day key as a Date at local noon (safe from daylight-saving edges). */
export function dayDate(day: string): Date {
  const [y = 0, m = 1, d = 1] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export type WeekDay = { day: string; played: boolean; future: boolean };

/**
 * Today's calendar week, Sunday to Saturday, and whether each day was played. Days
 * after today are marked `future`. The page lays them out in reading direction.
 */
export function weekDays(data: SaveData, today: string): WeekDay[] {
  const sunday = addDays(today, -dayDate(today).getDay());
  return Array.from({ length: WEEK }, (_, i) => {
    const day = addDays(sunday, i);
    return { day, played: playedOn(data, day), future: day > today };
  });
}

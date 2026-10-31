/** Local calendar day as YYYY-MM-DD (each player's day flips at their own midnight). */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Splits a YYYY-MM-DD key into its year, month (1-12) and day numbers. */
function parseDayKey(key: string): [year: number, month: number, day: number] {
  const [y = 0, m = 1, d = 1] = key.split("-").map(Number);
  return [y, m, d];
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = parseDayKey(key);
  return dayKey(new Date(y, m - 1, d + n));
}

const LAUNCH = "2026-11-01";
const DAY_MS = 86_400_000;

function toUtc(key: string): number {
  const [y, m, d] = parseDayKey(key);
  return Date.UTC(y, m - 1, d);
}

/** Puzzle number shown in share text (#1 on launch day). */
export function puzzleNumber(key: string): number {
  return Math.round((toUtc(key) - toUtc(LAUNCH)) / DAY_MS) + 1;
}

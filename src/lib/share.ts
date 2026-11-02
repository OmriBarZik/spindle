import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { puzzleNumber } from "./dates";
import type { SortDay } from "./saveData";
import { sortHits } from "./sortState";

/** Shares through the phone's share sheet, or copies to the clipboard elsewhere. */
export async function shareOrCopy(text: string): Promise<"shared" | "copied" | "failed"> {
  try {
    if (
      typeof navigator.share === "function" &&
      /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    ) {
      await navigator.share({ text });
      return "shared";
    }
  } catch {
    // fall through to clipboard
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

/** " · Israeli songs only" when a puzzle came from one kind of song, since it differs. */
function onlyTag(t: Messages, langs: readonly Locale[] | undefined): string {
  const [only] = langs ?? [];
  return langs?.length === 1 && only ? ` · ${t.settings.shareTag[only]}` : "";
}

const lines = (...parts: string[]) => parts.join("\n");

// Share links point at the game itself (`/sort`, `/timeline`) without a language prefix,
// so the proxy sends each friend to it in their own language.

/** Daily Five share text: head, one square per song, link to the game. */
export function sortShareText(t: Messages, day: string, sortDay: SortDay, origin: string): string {
  const head = t.sort.shareHead(
    puzzleNumber(day),
    sortHits(sortDay.placements),
    sortDay.songIds.length,
  );
  return lines(`${head}${onlyTag(t, sortDay.languages)}`, sortEmoji(sortDay), `${origin}/sort`);
}

export function sortEmoji(sortDay: SortDay): string {
  return sortDay.placements.map((p) => (p.correct ? "🟩" : "🟥")).join("");
}

/** Daily Timeline share text: head, run length, one square per song, link to the game. */
export function timelineShareText(
  t: Messages,
  day: string,
  { songs, wrong, langs }: { songs: number; wrong: boolean; langs: readonly Locale[] },
  origin: string,
): string {
  const head = `${t.timeline.shareHead(puzzleNumber(day))}${onlyTag(t, langs)}`;
  const squares = "🟩".repeat(songs);
  const link = `${origin}/timeline`;
  return wrong
    ? lines(head, t.timeline.shareEnded(songs), `${squares}🟥`, link)
    : lines(head, t.timeline.shareAlive(songs), squares, link);
}

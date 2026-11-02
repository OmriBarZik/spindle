import type { GameOpenEvent } from "./analytics";
import { timelineAnchorYearFor, timelineSongFor } from "./daily";
import { addDays } from "./dates";
import type { SaveData, TimelineState, TimelineToday } from "./saveData";
import { getSong, type Song, songLanguage } from "./songs";
import {
  anchorCard,
  correctSlot,
  isSlotCorrect,
  type LineItem,
  songCard,
  songCount,
  type TimelineCard,
} from "./timeline";

/** Whether the run shown in `timeline` is still alive going into `day`. */
function runContinues(timeline: TimelineState, day: string): boolean {
  return timeline.cards.length > 0 && !timeline.runOver && timeline.lastDate === addDays(day, -1);
}

/** Bring an unanswered turn up to date with the player's settings and the save format. */
function refreshPendingTurn(data: SaveData, day: string, pending: TimelineToday): SaveData {
  const { timeline } = data;
  const langs = data.settings.songLanguages;
  let today = pending;
  let cards = timeline.cards;
  // The player turned off this song's language before answering: swap it.
  const current = getSong(today.songId);
  if (current && !langs.includes(songLanguage(current))) {
    const exclude = new Set([...cards.map((c) => c.id), ...today.skipped, today.songId]);
    const swap = timelineSongFor(day, exclude, langs);
    if (swap && langs.includes(songLanguage(swap))) {
      today = { ...today, songId: swap.id };
    }
  }
  // Saves from before starting years existed: give today's turn one.
  if (cards.length === 0) {
    const song = getSong(today.songId);
    if (song) {
      cards = [anchorCard(timelineAnchorYearFor(day, song.year, langs))];
    }
  }
  if (today === pending && cards === timeline.cards) {
    return data;
  }
  return { ...data, timeline: { ...timeline, cards, today } };
}

/**
 * Prepare today's turn: keep the timeline if the player played yesterday and
 * didn't miss, otherwise start a fresh one from a free starting year. Then
 * lock in today's song.
 */
export function ensureTimelineDay(data: SaveData, day: string): SaveData {
  const { timeline } = data;
  const langs = data.settings.songLanguages;
  if (timeline.today?.date === day) {
    return timeline.today.result === "pending"
      ? refreshPendingTurn(data, day, timeline.today)
      : data;
  }

  const continuing = runContinues(timeline, day);
  const exclude = new Set(continuing ? timeline.cards.map((c) => c.id) : []);
  const song = timelineSongFor(day, exclude, langs);
  if (!song) {
    return data;
  }

  let next: TimelineState = { ...timeline };
  if (!continuing) {
    next = {
      ...next,
      cards: [anchorCard(timelineAnchorYearFor(day, song.year, langs))],
      runStart: day,
      runOver: false,
      lastDate: null,
      runs: timeline.runStart ? timeline.runs + 1 : timeline.runs,
    };
  }
  next.today = { date: day, songId: song.id, skipped: [], result: "pending" };
  return { ...data, timeline: next };
}

/** Today's turn, if it's still waiting for an answer. */
function pendingTurn(timeline: TimelineState, day: string): TimelineToday | null {
  return timeline.today?.date === day && timeline.today.result === "pending"
    ? timeline.today
    : null;
}

/** Swap today's song for another one when the video won't play. */
export function skipTimelineSong(data: SaveData, day: string): SaveData {
  const today = pendingTurn(data.timeline, day);
  if (!today) {
    return data;
  }
  const skipped = [...today.skipped, today.songId];
  const exclude = new Set([...data.timeline.cards.map((c) => c.id), ...skipped]);
  const song = timelineSongFor(day, exclude, data.settings.songLanguages);
  if (!song) {
    return data;
  }
  return {
    ...data,
    timeline: { ...data.timeline, today: { ...today, songId: song.id, skipped } },
  };
}

export function placeTimelineCard(data: SaveData, day: string, slot: number): SaveData {
  const { timeline } = data;
  const today = pendingTurn(timeline, day);
  if (!today) {
    return data;
  }
  if (slot < 0 || slot > timeline.cards.length) {
    return data;
  }
  const song = getSong(today.songId);
  if (!song) {
    return data;
  }
  const card = songCard(song);

  if (isSlotCorrect(timeline.cards, slot, card.year)) {
    const cards = timeline.cards.slice();
    cards.splice(slot, 0, card);
    return {
      ...data,
      timeline: {
        ...timeline,
        cards,
        lastDate: day,
        best: Math.max(timeline.best, songCount(cards)),
        today: { ...today, result: "correct", slot },
      },
    };
  }
  return {
    ...data,
    timeline: {
      ...timeline,
      lastDate: day,
      runOver: true,
      today: { ...today, result: "wrong", slot },
    },
  };
}

/** The timeline as swipe-line cards. After a wrong guess, today's song shows in red where it belongs. */
export function timelineLineItems(
  cards: readonly TimelineCard[],
  today: TimelineToday,
  song: Song,
  belongsHere: string,
): LineItem[] {
  const items: LineItem[] = cards.map((card) =>
    card.anchor
      ? { key: card.id, year: card.year, song: null }
      : {
          key: card.id,
          year: card.year,
          song: card,
          variant: today.result === "correct" && card.id === song.id ? "good" : "plain",
        },
  );
  if (today.result === "wrong") {
    items.splice(correctSlot(cards, song.year), 0, {
      key: `missed:${song.id}`,
      year: song.year,
      song,
      variant: "bad",
      note: belongsHere,
    });
  }
  return items;
}

/** What a Daily Timeline screen shows about today's turn. */
export function timelineView(timeline: TimelineState, today: TimelineToday) {
  const pending = today.result === "pending";
  const wrong = today.result === "wrong";
  const songs = songCount(timeline.cards);
  const startYear = timeline.cards.find((c) => c.anchor)?.year ?? null;
  return {
    pending,
    wrong,
    songs,
    dayNumber: Math.max(1, songs + (pending || wrong ? 1 : 0)),
    // The starting year, on the first day of a new timeline.
    firstDayYear: pending && songs === 0 ? startYear : null,
  };
}

/** Where today's card is once answered, or -1 while it's still unanswered. */
export function timelineAnswerAt(items: readonly LineItem[], pending: boolean): number {
  return pending ? -1 : items.findIndex((i) => i.variant !== "plain" && i.song);
}

/** How today's turn looked when the screen opened. */
export function timelineOpenEvent(data: SaveData): GameOpenEvent {
  return { mode: "timeline", status: data.timeline.today?.result === "pending" ? "new" : "done" };
}

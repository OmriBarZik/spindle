"use client";

import { Fragment, useState } from "react";
import Deck from "@/components/Deck";
import ShareButton from "@/components/ShareButton";
import { SlotButton, SongCard, Stats } from "@/components/TimelineParts";
import { dayKey, puzzleNumber } from "@/lib/dates";
import { getSong } from "@/lib/songs";
import {
  correctSlot,
  ensureTimelineDay,
  placeTimelineCard,
  revealAnchor,
  skipTimelineSong,
} from "@/lib/storage";
import { slotLabel, type TimelineCard } from "@/lib/timeline";
import { useSave } from "@/lib/useSave";
import { useHiddenPlayer } from "@/lib/youtube";

export default function TimelineGame() {
  const [day] = useState(() => dayKey());
  const [data, update] = useSave((d) => ensureTimelineDay(d, day));
  const { hostRef, player } = useHiddenPlayer();
  const [slot, setSlot] = useState<number | null>(null);

  const t = data.timeline;
  const today = t.today;
  const song = today ? getSong(today.songId) : undefined;
  if (!today || !song) {
    return <main className="p-8 text-center text-muted">No song available today.</main>;
  }

  const pending = today.result === "pending";
  const isAnchorDay = pending && t.cards.length === 0;
  const dayNumber = t.cards.length + (pending || today.result === "wrong" ? 1 : 0);
  const mystery: TimelineCard = {
    id: song.id,
    title: song.title,
    artist: song.artist,
    year: song.year,
    youtubeId: song.youtubeId,
  };

  // Cards to render, plus where to show the misplaced card after a wrong guess.
  const wrongAt = today.result === "wrong" ? correctSlot(t.cards, song.year) : null;

  const shareText = (() => {
    const head = `Spindle Timeline #${puzzleNumber(day)}`;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    if (today.result === "wrong")
      return `${head}\n❌ Timeline ended at ${t.cards.length} card${t.cards.length === 1 ? "" : "s"}\n${"🟩".repeat(Math.max(0, t.cards.length - 1))}🟥\n${origin}`;
    return `${head}\n🔥 ${t.cards.length} card${t.cards.length === 1 ? "" : "s"} and counting\n${"🟩".repeat(Math.max(0, t.cards.length - 1))}\n${origin}`;
  })();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16">
      <section className="text-center">
        <h1 className="text-2xl font-bold">Daily Timeline</h1>
        <p className="mt-1 text-sm text-muted">
          {isAnchorDay
            ? "Day 1 of a new timeline. Listen, then reveal your first card."
            : pending
              ? "Listen to today's song and drop it where it belongs on your timeline."
              : "Come back tomorrow for your next song."}
        </p>
        <p className="mt-2 text-xs uppercase tracking-widest text-muted">
          Timeline day {Math.max(1, dayNumber)} · Best {t.best}
        </p>
      </section>

      <Deck
        hostRef={hostRef}
        player={player}
        videoId={song.youtubeId}
        start={song.start}
        label={pending ? "TODAY" : String(song.year)}
        onSkip={pending ? () => update((d) => skipTimelineSong(d, day)) : undefined}
      />

      {isAnchorDay && (
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            player.stop();
            update((d) => revealAnchor(d, day));
          }}
        >
          Reveal &amp; start my timeline
        </button>
      )}

      {!isAnchorDay && (
        <ol className="flex flex-col gap-2">
          <li className="text-xs uppercase tracking-widest text-muted">▲ Oldest</li>
          {t.cards.map((card, i) => (
            <Fragment key={card.id}>
              {pending && (
                <SlotButton
                  label={slotLabel(t.cards, i)}
                  selected={slot === i}
                  onClick={() => setSlot(i)}
                />
              )}
              {wrongAt === i && <SongCard song={mystery} variant="bad" note="belongs here" />}
              <SongCard
                song={card}
                variant={
                  today.result === "correct" && card.id === song.id
                    ? "good"
                    : today.result === "anchor"
                      ? "good"
                      : "plain"
                }
              />
            </Fragment>
          ))}
          {pending && (
            <SlotButton
              label={slotLabel(t.cards, t.cards.length)}
              selected={slot === t.cards.length}
              onClick={() => setSlot(t.cards.length)}
            />
          )}
          {wrongAt === t.cards.length && (
            <SongCard song={mystery} variant="bad" note="belongs here" />
          )}
          <li className="text-xs uppercase tracking-widest text-muted">▼ Newest</li>
        </ol>
      )}

      {pending && !isAnchorDay && (
        <button
          type="button"
          className="btn-primary"
          disabled={slot === null}
          onClick={() => {
            if (slot === null) return;
            player.stop();
            update((d) => placeTimelineCard(d, day, slot));
          }}
        >
          {slot === null ? "Pick a spot on the timeline" : `Place it: ${slotLabel(t.cards, slot)}`}
        </button>
      )}

      {!pending && (
        <section className="card flex flex-col items-center gap-4 p-5 text-center">
          <div className="text-2xl font-bold">
            {today.result === "anchor" && "Your timeline has begun! 🎶"}
            {today.result === "correct" && "Nailed it! ✅"}
            {today.result === "wrong" && "Not quite ❌"}
          </div>
          <p className="text-sm text-muted">
            {today.result === "anchor" &&
              `Tomorrow you'll place a new song before or after ${song.year}.`}
            {today.result === "correct" &&
              `Your timeline now has ${t.cards.length} cards. Each day gets harder — don't miss a day!`}
            {today.result === "wrong" &&
              `"${song.title}" came out in ${song.year}. Your timeline ended at ${t.cards.length} card${t.cards.length === 1 ? "" : "s"}. A fresh one starts tomorrow.`}
          </p>
          <Stats
            items={[
              ["Cards", t.cards.length],
              ["Best", t.best],
              ["Runs", t.runs + 1],
              ["Day", Math.max(1, dayNumber)],
            ]}
          />
          {today.result !== "anchor" && <ShareButton text={shareText} />}
        </section>
      )}
    </main>
  );
}

"use client";

import { Fragment, useState } from "react";
import Deck from "@/components/Deck";
import ShareButton from "@/components/ShareButton";
import { AnchorCard, SlotButton, SongCard, Stats } from "@/components/TimelineParts";
import { useI18n } from "@/i18n/I18nProvider";
import { dayKey, puzzleNumber } from "@/lib/dates";
import { getSong, songNames } from "@/lib/songs";
import {
  correctSlot,
  ensureTimelineDay,
  placeTimelineCard,
  skipTimelineSong,
} from "@/lib/storage";
import { slotLabel, songCount, type TimelineCard } from "@/lib/timeline";
import { useSave } from "@/lib/useSave";
import { useHiddenPlayer } from "@/lib/youtube";

export default function TimelineGame() {
  const { lang, t: tr } = useI18n();
  const [day] = useState(() => dayKey());
  const [data, update] = useSave((d) => ensureTimelineDay(d, day));
  const { hostRef, player } = useHiddenPlayer();
  const [slot, setSlot] = useState<number | null>(null);

  const t = data.timeline;
  const today = t.today;
  const song = today ? getSong(today.songId) : undefined;
  if (!today || !song) {
    return <main className="p-8 text-center text-muted">{tr.timeline.noSong}</main>;
  }

  const pending = today.result === "pending";
  const songs = songCount(t.cards);
  const firstDay = pending && songs === 0;
  const startYear = t.cards.find((c) => c.anchor)?.year;
  const dayNumber = songs + (pending || today.result === "wrong" ? 1 : 0);
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
    const head = tr.timeline.shareHead(puzzleNumber(day));
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    if (today.result === "wrong")
      return `${head}\n${tr.timeline.shareEnded(songs)}\n${"🟩".repeat(songs)}🟥\n${origin}`;
    return `${head}\n${tr.timeline.shareAlive(songs)}\n${"🟩".repeat(songs)}\n${origin}`;
  })();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16">
      <section className="text-center">
        <h1 className="text-2xl font-bold">{tr.timeline.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {firstDay && startYear !== undefined
            ? tr.timeline.introFirst(startYear)
            : pending
              ? tr.timeline.introPending
              : tr.timeline.introDone}
        </p>
        <p className="mt-2 text-xs uppercase tracking-widest text-muted rtl:tracking-normal">
          {tr.timeline.dayLine(Math.max(1, dayNumber), t.best)}
        </p>
      </section>

      <Deck
        hostRef={hostRef}
        player={player}
        videoId={song.youtubeId}
        start={song.start}
        label={pending ? tr.timeline.today : String(song.year)}
        onSkip={pending ? () => update((d) => skipTimelineSong(d, day)) : undefined}
      />

      <ol className="flex flex-col gap-2">
        <li className="text-xs uppercase tracking-widest text-muted rtl:tracking-normal">{tr.common.oldest}</li>
        {t.cards.map((card, i) => (
          <Fragment key={card.id}>
            {pending && (
              <SlotButton
                label={slotLabel(t.cards, i, tr.slots)}
                selected={slot === i}
                onClick={() => setSlot(i)}
              />
            )}
            {wrongAt === i && <SongCard song={mystery} variant="bad" note={tr.timeline.belongsHere} />}
            {card.anchor ? (
              <AnchorCard year={card.year} />
            ) : (
              <SongCard
                song={card}
                variant={today.result === "correct" && card.id === song.id ? "good" : "plain"}
              />
            )}
          </Fragment>
        ))}
        {pending && (
          <SlotButton
            label={slotLabel(t.cards, t.cards.length, tr.slots)}
            selected={slot === t.cards.length}
            onClick={() => setSlot(t.cards.length)}
          />
        )}
        {wrongAt === t.cards.length && (
          <SongCard song={mystery} variant="bad" note={tr.timeline.belongsHere} />
        )}
        <li className="text-xs uppercase tracking-widest text-muted rtl:tracking-normal">{tr.common.newest}</li>
      </ol>

      {pending && (
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
          {slot === null ? tr.timeline.pickSpot : tr.common.placeIt(slotLabel(t.cards, slot, tr.slots))}
        </button>
      )}

      {!pending && (
        <section className="card flex flex-col items-center gap-4 p-5 text-center">
          <div className="text-2xl font-bold">
            {today.result === "correct" && tr.timeline.nailed}
            {today.result === "wrong" && tr.timeline.notQuite}
          </div>
          <p className="text-sm text-muted">
            {today.result === "correct" && tr.timeline.correctMsg(songs)}
            {today.result === "wrong" && tr.timeline.wrongMsg(songNames(song, lang).title, song.year, songs)}
          </p>
          <Stats
            items={[
              [tr.timeline.stats.songs, songs],
              [tr.timeline.stats.best, t.best],
              [tr.timeline.stats.runs, t.runs + 1],
              [tr.timeline.stats.day, Math.max(1, dayNumber)],
            ]}
          />
          <ShareButton text={shareText} />
        </section>
      )}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Deck, { type DeckSwap } from "@/components/Deck";
import ShareButton from "@/components/ShareButton";
import {
  AnchorCard,
  Announce,
  PlaceButton,
  ResultCard,
  SlotLine,
  SongCard,
  Stats,
} from "@/components/TimelineParts";
import { useI18n } from "@/i18n/I18nProvider";
import { track } from "@/lib/analytics";
import { dayKey } from "@/lib/dates";
import { timelineShareText } from "@/lib/share";
import { getSong, songNames } from "@/lib/songs";
import { ensureTimelineDay, placeTimelineCard, skipTimelineSong } from "@/lib/storage";
import { correctSlot, isSlotCorrect, songCard, songCount } from "@/lib/timeline";
import { useSave } from "@/lib/useSave";
import { useHiddenPlayer } from "@/lib/youtube";

export default function TimelineGame() {
  const { lang, t: tr } = useI18n();
  const [day] = useState(dayKey);
  const [data, update] = useSave((d) => ensureTimelineDay(d, day));
  const { hostRef, player } = useHiddenPlayer();
  const [slot, setSlot] = useState<number | null>(null);
  // Today's record glows green or red after the guess. There's no next song until tomorrow.
  const [swap, setSwap] = useState<DeckSwap | null>(null);

  // How today's turn looked when the screen opened, reported once.
  const [opened] = useState(() => {
    const status = data.timeline.today?.result === "pending" ? "new" : "done";
    return { mode: "timeline", status } as const;
  });
  useEffect(() => track("game_open", opened), [opened]);

  const t = data.timeline;
  const today = t.today;
  const song = getSong(today?.songId);
  if (!today || !song) {
    return <main className="p-8 text-center text-muted">{tr.timeline.noSong}</main>;
  }

  const pending = today.result === "pending";
  const wrong = today.result === "wrong";
  const songs = songCount(t.cards);
  const firstDay = pending && songs === 0;
  const startYear = t.cards.find((c) => c.anchor)?.year;
  const dayNumber = Math.max(1, songs + (pending || wrong ? 1 : 0));

  // After a wrong guess, today's song is shown in red where it really belongs.
  const wrongAt = wrong ? correctSlot(t.cards, song.year) : null;
  const misplaced = <SongCard song={songCard(song)} variant="bad" note={tr.timeline.belongsHere} />;

  const resultTitle = wrong ? tr.timeline.notQuite : tr.timeline.nailed;
  const resultText = wrong
    ? tr.timeline.wrongMsg(songNames(song, lang).title, song.year, songs)
    : tr.timeline.correctMsg(songs);

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
        <p className="mt-2 text-xs tracking-widest text-muted uppercase rtl:tracking-normal">
          {tr.timeline.dayLine(dayNumber, t.best)}
        </p>
      </section>

      <Deck
        hostRef={hostRef}
        player={player}
        videoId={song.youtubeId}
        start={song.start}
        label={pending ? tr.timeline.today : String(song.year)}
        onSkip={
          pending
            ? () => {
                update((d) => skipTimelineSong(d, day));
                track("song_skip", { mode: "timeline" });
              }
            : undefined
        }
        onPlay={() => track("song_play", { mode: "timeline", turn: songs + 1 })}
        swap={swap}
        onSwapEnd={() => setSwap(null)}
      />

      <SlotLine
        cards={t.cards}
        cardKey={(card) => card.id}
        renderCard={(card, i) => (
          <>
            {wrongAt === i && misplaced}
            {card.anchor ? (
              <AnchorCard year={card.year} />
            ) : (
              <SongCard
                song={card}
                variant={today.result === "correct" && card.id === song.id ? "good" : "plain"}
              />
            )}
          </>
        )}
        after={wrongAt === t.cards.length && misplaced}
        canPlace={pending}
        selected={slot}
        onSelect={setSlot}
      />

      <Announce>
        {!pending && (
          <>
            {resultTitle} {resultText}
          </>
        )}
      </Announce>

      {pending ? (
        <PlaceButton
          cards={t.cards}
          slot={slot}
          pickSpot={tr.timeline.pickSpot}
          onPlace={(at) => {
            player.stop();
            const correct = isSlotCorrect(t.cards, at, song.year);
            setSwap({ correct, kind: "flash" });
            track("song_place", { mode: "timeline", turn: songs + 1, correct });
            if (!correct) track("run_end", { mode: "timeline", songs });
            update((d) => placeTimelineCard(d, day, at));
          }}
        />
      ) : (
        <ResultCard>
          <div className="text-2xl font-bold">{resultTitle}</div>
          <p className="text-sm text-muted">{resultText}</p>
          <Stats
            items={[
              [tr.timeline.stats.songs, songs],
              [tr.timeline.stats.best, t.best],
              [tr.timeline.stats.runs, t.runs + 1],
              [tr.timeline.stats.day, dayNumber],
            ]}
          />
          <ShareButton
            mode="timeline"
            text={timelineShareText(
              tr,
              day,
              songs,
              wrong,
              data.settings.songLanguages,
              window.location.origin,
            )}
          />
        </ResultCard>
      )}
    </main>
  );
}

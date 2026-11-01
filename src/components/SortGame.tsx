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
import { useDropRecordFlight } from "@/lib/recordFlight";
import { sortEmoji, sortShareText } from "@/lib/share";
import { getSong, songNames } from "@/lib/songs";
import { ensureSortDay, placeSortSong, sortDayDone, sortLine } from "@/lib/storage";
import { isSlotCorrect } from "@/lib/timeline";
import { useSave } from "@/lib/useSave";
import { useHiddenPlayer } from "@/lib/youtube";

/**
 * Daily Five: start from a single year, then place five songs one at a time.
 */
export default function SortGame() {
  const { lang, t } = useI18n();
  const [day] = useState(dayKey);
  const [data, update] = useSave((d) => ensureSortDay(d, day));
  const { hostRef, player } = useHiddenPlayer();
  const [slot, setSlot] = useState<number | null>(null);
  // The record's result animation; the next song can't be played until it ends.
  const [swap, setSwap] = useState<DeckSwap | null>(null);
  // A finished day has no Deck to land on, so let the home record fade away.
  useDropRecordFlight();

  // How today's game looked when the screen opened, reported once.
  const [opened] = useState(() => {
    const d = data.sort.days[day];
    const placed = d?.placements.length ?? 0;
    const status = d && sortDayDone(d) ? "done" : placed > 0 ? "in_progress" : "new";
    return { mode: "daily_five", status } as const;
  });
  useEffect(() => track("game_open", opened), [opened]);

  // `ensureSortDay` always prepares today, so this is only a type guard.
  const state = data.sort.days[day];
  if (!state) return null;

  const done = sortDayDone(state);
  const line = sortLine(state);
  const turn = state.placements.length;
  const total = state.songIds.length;
  const current = done ? undefined : getSong(state.songIds[turn]);

  const last = getSong(state.songIds[turn - 1]);
  const lastCorrect = state.placements[turn - 1]?.correct ?? false;
  const lastNames = last && songNames(last, lang);
  const feedback = last && lastNames && !done && (
    <>
      {lastCorrect ? t.sort.correct : t.sort.wrong}{" "}
      {t.sort.reveal(lastNames.title, lastNames.artist, last.year)}
    </>
  );

  const hits = state.placements.filter((p) => p.correct).length;
  const score = hits === total ? t.sort.perfect : t.sort.score(hits, total);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16">
      <section className="text-center">
        <h1 className="text-2xl font-bold">{t.sort.name}</h1>
        <p className="mt-1 text-sm text-muted">{t.sort.intro(state.anchorYear)}</p>
        <div
          className="mt-3 flex justify-center gap-1.5"
          role="img"
          aria-label={t.sort.progress(Math.min(turn + 1, total), total)}
        >
          {state.songIds.map((id, i) => (
            <span
              key={id}
              className={`h-2.5 w-8 rounded-full ${
                i < turn
                  ? state.placements[i]?.correct
                    ? "bg-green-500"
                    : "bg-red-500"
                  : i === turn
                    ? "bg-white"
                    : "bg-white/15"
              }`}
            />
          ))}
        </div>
      </section>

      <Announce>{done ? score : feedback}</Announce>
      {feedback && (
        <p
          className={`rounded-xl px-3 py-2 text-center text-sm ${
            lastCorrect ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"
          }`}
        >
          {feedback}
        </p>
      )}

      {(!done || swap) && (
        <Deck
          hostRef={hostRef}
          player={player}
          videoId={current?.youtubeId ?? null}
          start={current?.start}
          label={done ? undefined : t.sort.deckLabel(turn + 1, total)}
          onPlay={() => track("song_play", { mode: "daily_five", turn: turn + 1 })}
          swap={swap}
          onSwapEnd={() => setSwap(null)}
        />
      )}

      <SlotLine
        cards={line}
        cardKey={(card) => (card.kind === "anchor" ? "anchor" : card.song.id)}
        renderCard={(card) =>
          card.kind === "anchor" ? (
            <AnchorCard year={card.year} />
          ) : (
            <SongCard
              song={card.song}
              variant={card.correct ? "good" : "bad"}
              note={card.correct ? undefined : t.sort.movedHere}
            />
          )
        }
        canPlace={!done}
        selected={slot}
        onSelect={setSlot}
      />

      {!done ? (
        <PlaceButton
          cards={line}
          slot={slot}
          pickSpot={t.sort.pickSpot}
          disabled={Boolean(swap)}
          onPlace={(at) => {
            if (!current) return;
            player.stop();
            const correct = isSlotCorrect(line, at, current.year);
            setSwap({ correct, kind: turn + 1 < total ? "next" : "last" });
            track("song_place", { mode: "daily_five", turn: turn + 1, correct });
            if (turn + 1 === total) {
              const final = hits + (correct ? 1 : 0);
              track("game_complete", {
                mode: "daily_five",
                score: final,
                total,
                perfect: final === total,
              });
            }
            update((d) => placeSortSong(d, day, at));
            setSlot(null);
          }}
        />
      ) : (
        <ResultCard>
          <div className="text-3xl font-bold">{score}</div>
          {/* The score above says the same for screen readers. */}
          <div dir="ltr" aria-hidden className="text-2xl tracking-widest">
            {sortEmoji(state)}
          </div>
          <Stats
            items={[
              [t.sort.stats.played, data.sort.stats.played],
              [t.sort.stats.perfect, data.sort.stats.perfect],
              [t.sort.stats.streak, data.sort.stats.streak],
              [t.sort.stats.bestStreak, data.sort.stats.maxStreak],
            ]}
          />
          <ShareButton
            mode="daily_five"
            text={sortShareText(t, day, state, window.location.origin)}
          />
          <p className="text-sm text-muted">{t.sort.tomorrow}</p>
        </ResultCard>
      )}
    </main>
  );
}

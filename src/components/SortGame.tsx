"use client";

import { Fragment, useState } from "react";
import Deck, { type DeckSwap } from "@/components/Deck";
import ShareButton from "@/components/ShareButton";
import { AnchorCard, SlotButton, SongCard, Stats } from "@/components/TimelineParts";
import { useI18n } from "@/i18n/I18nProvider";
import { dayKey, puzzleNumber } from "@/lib/dates";
import { getSong, songNames } from "@/lib/songs";
import { ensureSortDay, placeSortSong, sortDayDone, sortLine } from "@/lib/storage";
import { isSlotCorrect, slotLabel } from "@/lib/timeline";
import { useSave } from "@/lib/useSave";
import { useHiddenPlayer } from "@/lib/youtube";

/**
 * Daily Five: start from a single year, then place five songs one at a time.
 */
export default function SortGame() {
  const { lang, t } = useI18n();
  const [day] = useState(() => dayKey());
  const [data, update] = useSave((d) => ensureSortDay(d, day));
  const { hostRef, player } = useHiddenPlayer();
  const [slot, setSlot] = useState<number | null>(null);
  // The record's result animation; the next song can't be played until it ends.
  const [swap, setSwap] = useState<DeckSwap | null>(null);

  const state = data.sort.days[day];
  const done = sortDayDone(state);
  const line = sortLine(state);
  const turn = state.placements.length;
  const current = done ? undefined : getSong(state.songIds[turn]);
  const total = state.songIds.length;

  const lastIdx = turn - 1;
  const last = lastIdx >= 0 ? getSong(state.songIds[lastIdx]) : undefined;
  const lastCorrect = lastIdx >= 0 ? state.placements[lastIdx].correct : false;

  const hits = state.placements.filter((p) => p.correct).length;
  const emoji = state.placements.map((p) => (p.correct ? "🟩" : "🟥")).join("");
  // A puzzle picked from only one kind of song differs from everyone else's: say so.
  const only = state.languages?.length === 1 ? ` · ${t.settings.shareTag[state.languages[0]]}` : "";
  const shareText = `${t.sort.shareHead(puzzleNumber(day), hits, total)}${only}\n${emoji}\n${
    typeof window !== "undefined" ? window.location.origin : ""
  }`;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16">
      <section className="text-center">
        <h1 className="text-2xl font-bold">{t.sort.name}</h1>
        <p className="mt-1 text-sm text-muted">{t.sort.intro(state.anchorYear)}</p>
        <div
          className="mt-3 flex justify-center gap-1.5"
          aria-label={t.sort.progress(Math.min(turn + 1, total), total)}
        >
          {state.songIds.map((id, i) => (
            <span
              key={id}
              className={`h-2.5 w-8 rounded-full ${
                i < turn
                  ? state.placements[i].correct
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

      {last && !done && (
        <p
          className={`rounded-xl px-3 py-2 text-center text-sm ${
            lastCorrect ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"
          }`}
        >
          {lastCorrect ? t.sort.correct : t.sort.wrong} {t.sort.reveal(songNames(last, lang).title, songNames(last, lang).artist, last.year)}
        </p>
      )}

      {(!done || swap) && (
        <Deck
          hostRef={hostRef}
          player={player}
          videoId={current?.youtubeId ?? null}
          start={current?.start}
          label={done ? undefined : t.sort.deckLabel(turn + 1, total)}
          swap={swap}
          onSwapEnd={() => setSwap(null)}
        />
      )}

      <ol className="flex flex-col gap-2">
        <li className="text-xs uppercase tracking-widest text-muted rtl:tracking-normal">{t.common.oldest}</li>
        {line.map((card, i) => (
          <Fragment key={card.kind === "anchor" ? "anchor" : card.id}>
            {!done && (
              <SlotButton label={slotLabel(line, i, t.slots)} selected={slot === i} onClick={() => setSlot(i)} />
            )}
            {card.kind === "anchor" ? (
              <AnchorCard year={card.year} />
            ) : (
              <SongCard
                song={getSong(card.id)!}
                variant={card.correct ? "good" : "bad"}
                note={card.correct ? undefined : t.sort.movedHere}
              />
            )}
          </Fragment>
        ))}
        {!done && (
          <SlotButton
            label={slotLabel(line, line.length, t.slots)}
            selected={slot === line.length}
            onClick={() => setSlot(line.length)}
          />
        )}
        <li className="text-xs uppercase tracking-widest text-muted rtl:tracking-normal">{t.common.newest}</li>
      </ol>

      {!done ? (
        <button
          type="button"
          className="btn-primary"
          disabled={slot === null || !!swap}
          onClick={() => {
            if (slot === null || !current) return;
            player.stop();
            setSwap({
              correct: isSlotCorrect(line, slot, current.year),
              kind: turn + 1 < total ? "next" : "last",
            });
            update((d) => placeSortSong(d, day, slot));
            setSlot(null);
          }}
        >
          {slot === null ? t.sort.pickSpot : t.common.placeIt(slotLabel(line, slot, t.slots))}
        </button>
      ) : (
        <section className="card flex flex-col items-center gap-4 p-5 text-center">
          <div className="text-3xl font-bold">
            {hits === total ? t.sort.perfect : t.sort.score(hits, total)}
          </div>
          <div dir="ltr" className="text-2xl tracking-widest">{emoji}</div>
          <Stats
            items={[
              [t.sort.stats.played, data.sort.stats.played],
              [t.sort.stats.perfect, data.sort.stats.perfect],
              [t.sort.stats.streak, data.sort.stats.streak],
              [t.sort.stats.bestStreak, data.sort.stats.maxStreak],
            ]}
          />
          <ShareButton text={shareText} />
          <p className="text-sm text-muted">{t.sort.tomorrow}</p>
        </section>
      )}
    </main>
  );
}

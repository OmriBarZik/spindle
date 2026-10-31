"use client";

import { Fragment, useState } from "react";
import Deck from "@/components/Deck";
import ShareButton from "@/components/ShareButton";
import { AnchorCard, SlotButton, SongCard, Stats } from "@/components/TimelineParts";
import { dayKey, puzzleNumber } from "@/lib/dates";
import { getSong } from "@/lib/songs";
import { ensureSortDay, placeSortSong, sortDayDone, sortLine } from "@/lib/storage";
import { slotLabel } from "@/lib/timeline";
import { useSave } from "@/lib/useSave";
import { useHiddenPlayer } from "@/lib/youtube";

/**
 * Daily Five: start from a single year, then place five songs one at a time.
 */
export default function SortGame() {
  const [day] = useState(() => dayKey());
  const [data, update] = useSave((d) => ensureSortDay(d, day));
  const { hostRef, player } = useHiddenPlayer();
  const [slot, setSlot] = useState<number | null>(null);

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
  const shareText = `Spindle Daily Five #${puzzleNumber(day)} ${hits}/${total}\n${emoji}\n${
    typeof window !== "undefined" ? window.location.origin : ""
  }`;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16">
      <section className="text-center">
        <h1 className="text-2xl font-bold">Daily Five</h1>
        <p className="mt-1 text-sm text-muted">
          Your line starts at <b className="text-white">{state.anchorYear}</b>. Listen to each song
          and drop it before or after the cards you already have — one song at a time.
        </p>
        <div className="mt-3 flex justify-center gap-1.5" aria-label={`Song ${Math.min(turn + 1, total)} of ${total}`}>
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
          {lastCorrect ? "✅ Correct!" : "❌ Not quite."} “{last.title}” by {last.artist} is from{" "}
          <b>{last.year}</b>.
        </p>
      )}

      {!done && (
        <Deck
          hostRef={hostRef}
          player={player}
          videoId={current?.youtubeId ?? null}
          start={current?.start}
          label={`SONG ${turn + 1} OF ${total}`}
        />
      )}

      <ol className="flex flex-col gap-2">
        <li className="text-xs uppercase tracking-widest text-muted">▲ Oldest</li>
        {line.map((card, i) => (
          <Fragment key={card.kind === "anchor" ? "anchor" : card.id}>
            {!done && (
              <SlotButton label={slotLabel(line, i)} selected={slot === i} onClick={() => setSlot(i)} />
            )}
            {card.kind === "anchor" ? (
              <AnchorCard year={card.year} />
            ) : (
              <SongCard
                song={getSong(card.id)!}
                variant={card.correct ? "good" : "bad"}
                note={card.correct ? undefined : "moved here"}
              />
            )}
          </Fragment>
        ))}
        {!done && (
          <SlotButton
            label={slotLabel(line, line.length)}
            selected={slot === line.length}
            onClick={() => setSlot(line.length)}
          />
        )}
        <li className="text-xs uppercase tracking-widest text-muted">▼ Newest</li>
      </ol>

      {!done ? (
        <button
          type="button"
          className="btn-primary"
          disabled={slot === null}
          onClick={() => {
            if (slot === null) return;
            player.stop();
            update((d) => placeSortSong(d, day, slot));
            setSlot(null);
          }}
        >
          {slot === null ? "Pick a spot on the line" : `Place it: ${slotLabel(line, slot)}`}
        </button>
      ) : (
        <section className="card flex flex-col items-center gap-4 p-5 text-center">
          <div className="text-3xl font-bold">
            {hits === total ? "Perfect! 🎉" : `${hits} / ${total} placed right`}
          </div>
          <div className="text-2xl tracking-widest">{emoji}</div>
          <Stats
            items={[
              ["Played", data.sort.stats.played],
              ["Perfect", data.sort.stats.perfect],
              ["Streak", data.sort.stats.streak],
              ["Best streak", data.sort.stats.maxStreak],
            ]}
          />
          <ShareButton text={shareText} />
          <p className="text-sm text-muted">New songs tomorrow.</p>
        </section>
      )}
    </main>
  );
}

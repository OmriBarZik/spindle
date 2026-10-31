"use client";

import { useState } from "react";
import Deck from "@/components/Deck";
import ShareButton from "@/components/ShareButton";
import SongReveal from "@/components/SongReveal";
import { dayKey, puzzleNumber } from "@/lib/dates";
import { getSong } from "@/lib/songs";
import { ensureSortDay, moveSortItem, submitSort } from "@/lib/storage";
import { useSave } from "@/lib/useSave";
import { useHiddenPlayer } from "@/lib/youtube";

const LETTERS = ["A", "B", "C", "D", "E"];
const COLORS = ["#f97316", "#22c55e", "#3b82f6", "#e879f9", "#facc15"];

export default function SortGame() {
  const [day] = useState(() => dayKey());
  const [data, update] = useSave((d) => ensureSortDay(d, day));
  const { hostRef, player } = useHiddenPlayer();
  const state = data.sort.days[day];

  // Letters stay attached to songs (not positions) so players can say "C is oldest".
  const [letterOf] = useState(
    () => new Map((data.sort.days[day]?.order ?? []).map((id, i) => [id, i])),
  );

  const [selected, setSelected] = useState<string>(state.order[0]);
  const selectedSong = getSong(selected);
  const selIdx = letterOf.get(selected) ?? 0;

  const hits = state.correct?.filter(Boolean).length ?? 0;
  const shareText = state.submitted
    ? `Spindle Sort #${puzzleNumber(day)} ${hits}/5\n${state.correct!
        .map((c) => (c ? "🟩" : "🟥"))
        .join("")}\n${typeof window !== "undefined" ? window.location.origin : ""}`
    : "";

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16">
      <section className="text-center">
        <h1 className="text-2xl font-bold">Daily Sort</h1>
        <p className="mt-1 text-sm text-muted">
          Listen to all five songs, then order them from <b>oldest</b> (top) to{" "}
          <b>newest</b> (bottom).
        </p>
      </section>

      <Deck
        hostRef={hostRef}
        player={player}
        videoId={selectedSong?.youtubeId ?? null}
        start={selectedSong?.start}
        label={`SONG ${LETTERS[selIdx]}`}
        accent={COLORS[selIdx]}
      />

      <ol className="flex flex-col gap-2">
        <li className="text-xs uppercase tracking-widest text-muted">▲ Oldest</li>
        {state.order.map((id, pos) => {
          const song = getSong(id);
          if (!song) return null;
          const li = letterOf.get(id) ?? pos;
          const isPlaying =
            player.currentId === song.youtubeId &&
            (player.status === "playing" || player.status === "loading");
          const correct = state.correct?.[pos];
          return (
            <li
              key={id}
              className={`card flex items-center gap-3 p-3 transition ${
                selected === id ? "ring-2 ring-white/60" : ""
              } ${state.submitted ? (correct ? "card-good" : "card-bad") : ""}`}
            >
              <button
                type="button"
                onClick={() => {
                  setSelected(id);
                  player.toggle(song.youtubeId, song.start);
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold text-black"
                style={{ background: COLORS[li] }}
                aria-label={`${isPlaying ? "Pause" : "Play"} song ${LETTERS[li]}`}
              >
                {isPlaying ? "❚❚" : LETTERS[li]}
              </button>

              <div className="min-w-0 flex-1">
                {state.submitted ? (
                  <SongReveal {...song} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelected(id)}
                    className="w-full text-left"
                  >
                    <div className="font-semibold">Song {LETTERS[li]}</div>
                    <div className="text-sm text-muted">
                      {isPlaying ? "Playing…" : "Tap the circle to listen"}
                    </div>
                  </button>
                )}
              </div>

              {state.submitted ? (
                <div className="text-right">
                  <div className="text-lg font-bold tabular-nums">{song.year}</div>
                  <div className="text-xs">{correct ? "✅" : "❌"}</div>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    aria-label="Move up (older)"
                    disabled={pos === 0}
                    onClick={() => update((d) => moveSortItem(d, day, pos, pos - 1))}
                    className="arrow-btn"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label="Move down (newer)"
                    disabled={pos === state.order.length - 1}
                    onClick={() => update((d) => moveSortItem(d, day, pos, pos + 1))}
                    className="arrow-btn"
                  >
                    ▼
                  </button>
                </div>
              )}
            </li>
          );
        })}
        <li className="text-xs uppercase tracking-widest text-muted">▼ Newest</li>
      </ol>

      {!state.submitted ? (
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            player.stop();
            update((d) => submitSort(d, day));
          }}
        >
          Lock in my order
        </button>
      ) : (
        <section className="card flex flex-col items-center gap-4 p-5 text-center">
          <div className="text-3xl font-bold">
            {hits === 5 ? "Perfect! 🎉" : `${hits} / 5 in the right spot`}
          </div>
          <div className="text-2xl tracking-widest">
            {state.correct!.map((c) => (c ? "🟩" : "🟥")).join("")}
          </div>
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

export function Stats({ items }: { items: [string, number][] }) {
  return (
    <dl className="grid w-full grid-cols-4 gap-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[11px] uppercase tracking-wider text-muted">{label}</dt>
          <dd className="text-xl font-bold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

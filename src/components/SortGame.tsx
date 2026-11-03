"use client";

import type { ReactNode } from "react";
import { Announce } from "@/components/Announce";
import { Deck } from "@/components/Deck";
import { KeyHints } from "@/components/KeyHints";
import { PlaceButton } from "@/components/PlaceButton";
import { ScreenMain } from "@/components/ScreenMain";
import { SortFeedback } from "@/components/SortFeedback";
import { SortFeedbackBox } from "@/components/SortFeedbackBox";
import { SortHeader } from "@/components/SortHeader";
import { SortResult } from "@/components/SortResult";
import { SwipeLine } from "@/components/SwipeLine";
import { useDropRecordFlight } from "@/hooks/recordFlight";
import { useGameScreen } from "@/hooks/useGameScreen";
import { hasHeard } from "@/hooks/useHiddenPlayer";
import { useI18n } from "@/i18n/I18nProvider";
import type { Messages } from "@/i18n/messages";
import { track } from "@/lib/analytics";
import {
  ensureSortDay,
  placeSortSong,
  sortLineItems,
  sortOpenEvent,
  sortView,
} from "@/lib/sortState";
import { isSlotCorrect, recordSlot } from "@/lib/timeline";

function sortScoreText(t: Messages, hits: number, total: number) {
  return hits === total ? t.sort.perfect : t.sort.score(hits, total);
}

/**
 * Daily Five: start from a single year, then place five songs one at a time.
 */
export function SortGame() {
  const { t } = useI18n();
  const { day, data, update, hostRef, player, slot, setSlot, live, swap, setSwap } = useGameScreen(
    ensureSortDay,
    sortOpenEvent,
  );
  // A finished day has no Deck to land on, so let the home record fade away.
  useDropRecordFlight();

  // `ensureSortDay` always prepares today, so this is only a type guard.
  const state = data.sort.days[day];
  if (!state) {
    return null;
  }

  const { done, line, turn, total, current, last, lastCorrect, hits, lastAt } = sortView(state);
  const feedback = last && !done ? <SortFeedback song={last} correct={lastCorrect} /> : null;
  const score = sortScoreText(t, hits, total);
  const items = sortLineItems(line);
  // While the record glows, the line holds still with the song just placed beside it,
  // so the player sees where it landed.
  const placing = !done || Boolean(swap);
  const at = recordSlot(Boolean(swap), lastAt, slot, line.length);

  const place = (where: number) => {
    if (!current || swap) {
      return;
    }
    player.stop();
    const correct = isSlotCorrect(line, where, current.year);
    const lastSong = turn + 1 === total;
    setSwap({ correct, kind: lastSong ? "last" : "next" });
    track("song_place", { mode: "daily_five", turn: turn + 1, correct });
    if (lastSong) {
      const final = hits + (correct ? 1 : 0);
      track("game_complete", {
        mode: "daily_five",
        score: final,
        total,
        perfect: final === total,
      });
    }
    update((d) => placeSortSong(d, day, where));
    setSlot(null);
  };

  const swipeLine = (record?: ReactNode) => (
    <SwipeLine
      items={items}
      slot={placing ? at : null}
      onSlot={setSlot}
      focus={Math.max(0, lastAt)}
      record={record}
      live={live}
      reveal={Boolean(swap)}
    />
  );

  return (
    <ScreenMain game="daily">
      <SortHeader state={state} />

      <Announce>{done ? score : feedback}</Announce>
      {feedback ? <SortFeedbackBox correct={lastCorrect}>{feedback}</SortFeedbackBox> : null}

      {!done || swap ? (
        <Deck
          hostRef={hostRef}
          player={player}
          videoId={current?.youtubeId ?? null}
          start={current?.start}
          label={done ? undefined : t.sort.deckLabel(turn + 1, total)}
          onPlay={() => track("song_play", { mode: "daily_five", turn: turn + 1 })}
          swap={swap}
          onSwapEnd={() => setSwap(null)}
          around={swipeLine}
        />
      ) : (
        swipeLine()
      )}

      {done ? (
        <SortResult day={day} state={state} stats={data.sort.stats} score={score} />
      ) : (
        <>
          <PlaceButton
            live={live}
            cards={line}
            slot={at}
            disabled={Boolean(swap)}
            heard={hasHeard(player, current)}
            onPlace={place}
          />
          <KeyHints />
        </>
      )}
    </ScreenMain>
  );
}

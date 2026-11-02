"use client";

import type { ReactNode } from "react";
import { Announce } from "@/components/Announce";
import { Deck } from "@/components/Deck";
import { MarathonFeedback } from "@/components/MarathonFeedback";
import { MarathonHeader } from "@/components/MarathonHeader";
import { MarathonResult } from "@/components/MarathonResult";
import { MarathonSongList } from "@/components/MarathonSongList";
import { PlaceButton } from "@/components/PlaceButton";
import { ScreenMain } from "@/components/ScreenMain";
import { SortFeedbackBox } from "@/components/SortFeedbackBox";
import { SwipeLine } from "@/components/SwipeLine";
import { useDropRecordFlight } from "@/hooks/recordFlight";
import { useGameScreen } from "@/hooks/useGameScreen";
import { useI18n } from "@/i18n/I18nProvider";
import { track } from "@/lib/analytics";
import {
  ensureMarathonDay,
  marathonEndText,
  marathonOpenEvent,
  marathonOutcome,
  marathonView,
  placeMarathonSong,
  skipMarathonSong,
} from "@/lib/marathonState";
import { sortLineItems } from "@/lib/sortState";
import { recordSlot } from "@/lib/timeline";

/**
 * Marathon: place songs on one growing line for as long as you can. Each wrong
 * placement costs a heart; when the last one goes, the day's score is final.
 */
export function MarathonGame() {
  const { t } = useI18n();
  const { day, data, update, hostRef, player, slot, setSlot, live, swap, setSwap } = useGameScreen(
    ensureMarathonDay,
    marathonOpenEvent,
  );
  // A finished day has no Deck to land on, so let the home record fade away.
  useDropRecordFlight();

  // `ensureMarathonDay` always prepares today, so this is only a type guard.
  const state = data.marathon.days[day];
  if (!state) {
    return null;
  }

  const { done, line, turn, current, last, lastCorrect, hits, hearts, lastAt } = marathonView(
    day,
    state,
  );
  const feedback = last && !done ? <MarathonFeedback song={last} correct={lastCorrect} /> : null;
  const { title, score } = marathonEndText(t, hearts, hits);
  const items = sortLineItems(line, t.sort.movedHere);
  // While the record glows, the line holds still with the song just placed beside it.
  const placing = !done || Boolean(swap);
  const at = recordSlot(Boolean(swap), lastAt, slot, line.length);

  const place = (where: number) => {
    if (!current || swap) {
      return;
    }
    player.stop();
    const { correct, ends, score: final } = marathonOutcome(data, day, where);
    setSwap({ correct, kind: ends ? "last" : "next" });
    track("song_place", { mode: "marathon", turn: turn + 1, correct });
    if (ends) {
      track("game_complete", { mode: "marathon", score: final });
    }
    update((d) => placeMarathonSong(d, day, where));
    setSlot(null);
  };

  const skip = () => {
    update((d) => skipMarathonSong(d, day));
    track("song_skip", { mode: "marathon" });
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
    <ScreenMain>
      <MarathonHeader anchorYear={state.anchorYear} hearts={hearts} hits={hits} />

      <Announce>
        {done ? (
          <>
            {title} {score}
          </>
        ) : (
          feedback
        )}
      </Announce>
      {feedback ? <SortFeedbackBox correct={lastCorrect}>{feedback}</SortFeedbackBox> : null}

      {!done || swap ? (
        <Deck
          hostRef={hostRef}
          player={player}
          videoId={current?.youtubeId ?? null}
          start={current?.start}
          label={done ? undefined : t.marathon.deckLabel(turn + 1)}
          onSkip={done ? undefined : skip}
          onPlay={() => track("song_play", { mode: "marathon", turn: turn + 1 })}
          swap={swap}
          onSwapEnd={() => setSwap(null)}
          around={swipeLine}
        />
      ) : (
        swipeLine()
      )}

      {done ? (
        <>
          <MarathonResult
            day={day}
            state={state}
            stats={data.marathon.stats}
            title={title}
            score={score}
            hits={hits}
          />
          <MarathonSongList state={state} />
        </>
      ) : (
        <PlaceButton live={live} cards={line} slot={at} disabled={Boolean(swap)} onPlace={place} />
      )}
    </ScreenMain>
  );
}

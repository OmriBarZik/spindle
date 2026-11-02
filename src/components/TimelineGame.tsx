"use client";

import type { ReactNode } from "react";
import { Announce } from "@/components/Announce";
import { Deck } from "@/components/Deck";
import { PlaceButton } from "@/components/PlaceButton";
import { ScreenMain } from "@/components/ScreenMain";
import { SwipeLine } from "@/components/SwipeLine";
import { TimelineHeader } from "@/components/TimelineHeader";
import { TimelineResult } from "@/components/TimelineResult";
import { useGameScreen } from "@/hooks/useGameScreen";
import { useI18n } from "@/i18n/I18nProvider";
import { track } from "@/lib/analytics";
import { getSong, songNames } from "@/lib/songs";
import { defaultSlot, isSlotCorrect } from "@/lib/timeline";
import {
  ensureTimelineDay,
  placeTimelineCard,
  skipTimelineSong,
  timelineAnswerAt,
  timelineLineItems,
  timelineOpenEvent,
  timelineView,
} from "@/lib/timelineState";

export function TimelineGame() {
  const { lang, t } = useI18n();
  const { day, data, update, hostRef, player, slot, setSlot, live, swap, setSwap } = useGameScreen(
    ensureTimelineDay,
    timelineOpenEvent,
  );

  const { timeline } = data;
  const { cards, today } = timeline;
  const song = getSong(today?.songId);
  if (!today || !song) {
    return <main className="p-400 text-center text-muted">{t.timeline.noSong}</main>;
  }

  const { pending, wrong, songs, dayNumber, firstDayYear } = timelineView(timeline, today);

  const items = timelineLineItems(cards, today, song, t.timeline.belongsHere);
  // Today's card once answered: the line centers on it.
  const answerAt = timelineAnswerAt(items, pending);
  // While the record glows, the line holds still with today's card beside it.
  const placing = pending || Boolean(swap);
  const at = answerAt >= 0 ? answerAt + 1 : (slot ?? defaultSlot(cards.length));

  const place = (where: number) => {
    if (!pending) {
      return;
    }
    player.stop();
    const correct = isSlotCorrect(cards, where, song.year);
    setSwap({ correct, kind: "flash" });
    track("song_place", { mode: "timeline", turn: songs + 1, correct });
    if (!correct) {
      track("run_end", { mode: "timeline", songs });
    }
    update((d) => placeTimelineCard(d, day, where));
  };

  const skip = () => {
    update((d) => skipTimelineSong(d, day));
    track("song_skip", { mode: "timeline" });
  };

  const resultTitle = wrong ? t.timeline.notQuite : t.timeline.nailed;
  const resultText = wrong
    ? t.timeline.wrongMsg(songNames(song, lang).title, song.year, songs)
    : t.timeline.correctMsg(songs);

  const swipeLine = (record: ReactNode) => (
    <SwipeLine
      items={items}
      slot={placing ? at : null}
      onSlot={setSlot}
      focus={Math.max(0, answerAt)}
      record={record}
      live={live}
      reveal={!pending}
    />
  );

  return (
    <ScreenMain game="timeline">
      <TimelineHeader
        pending={pending}
        firstDayYear={firstDayYear}
        dayNumber={dayNumber}
        best={timeline.best}
      />

      <Deck
        hostRef={hostRef}
        player={player}
        videoId={song.youtubeId}
        start={song.start}
        label={pending ? t.timeline.today : String(song.year)}
        onSkip={pending ? skip : undefined}
        onPlay={() => track("song_play", { mode: "timeline", turn: songs + 1 })}
        swap={swap}
        onSwapEnd={() => setSwap(null)}
        around={swipeLine}
      />

      <Announce>
        {pending ? null : (
          <>
            {resultTitle} {resultText}
          </>
        )}
      </Announce>

      {pending ? (
        <PlaceButton live={live} cards={cards} slot={at} onPlace={place} />
      ) : (
        <TimelineResult
          title={resultTitle}
          text={resultText}
          day={day}
          wrong={wrong}
          dayNumber={dayNumber}
          data={data}
        />
      )}
    </ScreenMain>
  );
}

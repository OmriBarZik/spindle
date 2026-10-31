"use client";

import { Fragment, type ReactNode } from "react";
import SongReveal from "@/components/SongReveal";
import { useI18n } from "@/i18n/I18nProvider";
import { slotLabel } from "@/lib/timeline";

/**
 * Text for screen readers only, read out when it changes (e.g. "Correct!").
 * Always mounted, since a live region added together with its text is often missed.
 * It's absolutely positioned, so it takes no space in flex or grid layouts.
 */
export function Announce({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  );
}

export function SlotButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  const { t } = useI18n();
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={`w-full rounded-xl border-2 border-dashed px-3 py-2 text-sm transition ${
          selected
            ? "border-white bg-white/10 font-semibold text-white"
            : "border-line text-muted hover:border-white/50 hover:text-white"
        }`}
      >
        {selected ? t.common.songGoesHere(label) : t.common.addSlot(label)}
      </button>
    </li>
  );
}

/** "▲ Oldest" / "▼ Newest" at the ends of a line. */
function LineEdge({ children }: { children: ReactNode }) {
  return (
    <li className="text-xs tracking-widest text-muted uppercase rtl:tracking-normal">{children}</li>
  );
}

/**
 * A line of cards from oldest to newest. While `canPlace`, a gap button sits before
 * every card and after the last one (slot `i` = before `cards[i]`).
 */
export function SlotLine<T extends { year: number }>({
  cards,
  cardKey,
  renderCard,
  after,
  canPlace,
  selected,
  onSelect,
}: {
  cards: readonly T[];
  cardKey: (card: T) => string;
  renderCard: (card: T, index: number) => ReactNode;
  /** Shown after the last card (and its gap). */
  after?: ReactNode;
  canPlace: boolean;
  selected: number | null;
  onSelect: (slot: number) => void;
}) {
  const { t } = useI18n();
  const gap = (slot: number) =>
    canPlace && (
      <SlotButton
        label={slotLabel(cards, slot, t.slots)}
        selected={selected === slot}
        onClick={() => onSelect(slot)}
      />
    );
  return (
    <ol className="flex flex-col gap-2">
      <LineEdge>{t.common.oldest}</LineEdge>
      {cards.map((card, i) => (
        <Fragment key={cardKey(card)}>
          {gap(i)}
          {renderCard(card, i)}
        </Fragment>
      ))}
      {gap(cards.length)}
      {after}
      <LineEdge>{t.common.newest}</LineEdge>
    </ol>
  );
}

/** The big "Place it: 1990 – 1995" button under a line. */
export function PlaceButton({
  cards,
  slot,
  pickSpot,
  disabled = false,
  onPlace,
}: {
  cards: readonly { year: number }[];
  slot: number | null;
  /** Shown before a gap is chosen. */
  pickSpot: string;
  disabled?: boolean;
  onPlace: (slot: number) => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="btn-primary"
      disabled={slot === null || disabled}
      onClick={() => {
        if (slot !== null) onPlace(slot);
      }}
    >
      {slot === null ? pickSpot : t.common.placeIt(slotLabel(cards, slot, t.slots))}
    </button>
  );
}

export function SongCard({
  song,
  variant,
  note,
}: {
  song: { title: string; artist: string; year: number; youtubeId: string };
  variant: "plain" | "good" | "bad";
  note?: string;
}) {
  const variantClass = { plain: "", good: "card-good", bad: "card-bad" }[variant];
  return (
    <li className={`card flex items-center gap-3 p-3 ${variantClass}`}>
      <CardYear year={song.year} />
      <SongReveal {...song} />
      {note && <span className="ms-auto shrink-0 text-xs">{note}</span>}
    </li>
  );
}

export function AnchorCard({ year }: { year: number }) {
  const { t } = useI18n();
  return (
    <li className="card card-anchor flex items-center gap-3 p-3">
      <CardYear year={year} />
      <div className="text-sm text-muted">{t.common.startingYear}</div>
    </li>
  );
}

function CardYear({ year }: { year: number }) {
  return <div className="w-14 shrink-0 text-center text-xl font-bold tabular-nums">{year}</div>;
}

/** The end-of-day box with the result, stats and share button. */
export function ResultCard({ children }: { children: ReactNode }) {
  return (
    <section className="card flex flex-col items-center gap-4 p-5 text-center">{children}</section>
  );
}

export function Stats({ items }: { items: [label: string, value: number][] }) {
  return (
    <dl className="grid w-full grid-cols-4 gap-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[11px] tracking-wider text-muted uppercase">{label}</dt>
          <dd className="text-xl font-bold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

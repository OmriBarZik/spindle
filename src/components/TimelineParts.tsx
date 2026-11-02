"use client";

import { Fragment, type ReactNode } from "react";
import ExternalLink from "@/components/ExternalLink";
import SongReveal from "@/components/SongReveal";
import { useI18n } from "@/i18n/I18nProvider";
import { useDesign } from "@/lib/design";
import { getSong, songNames } from "@/lib/songs";
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
  onPlace,
  placeDisabled = false,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  /** Compact and chips layouts: tapping the chosen gap again places the song. */
  onPlace?: () => void;
  placeDisabled?: boolean;
}) {
  const { t } = useI18n();
  const design = useDesign();

  if (design === "compact") {
    // The chosen gap turns into the "Place it" button, right where the finger is.
    return (
      <li>
        {selected && onPlace ? (
          <button
            type="button"
            onClick={onPlace}
            disabled={placeDisabled}
            className="w-full rounded-xl bg-white px-3 py-2.5 text-sm font-bold text-black transition active:scale-[0.98] disabled:opacity-40"
          >
            ✓ {t.common.placeIt(label)}
          </button>
        ) : (
          <button
            type="button"
            onClick={onClick}
            aria-pressed={false}
            className="w-full rounded-lg border border-dashed border-line px-3 py-1 text-xs text-muted transition hover:border-white/50 hover:text-white"
          >
            {t.common.addSlot(label)}
          </button>
        )}
      </li>
    );
  }

  if (design === "chips") {
    return (
      <li className="flex">
        <button
          type="button"
          onClick={selected && onPlace ? onPlace : onClick}
          disabled={selected && placeDisabled}
          aria-pressed={selected}
          aria-label={selected ? t.common.placeIt(label) : t.common.addSlot(label)}
          title={label}
          className={`flex min-h-11 items-center justify-center rounded-xl border-2 border-dashed font-bold transition ${
            selected
              ? "border-white bg-white px-3 text-sm text-black"
              : "w-9 border-line text-lg text-muted hover:border-white/50 hover:text-white"
          }`}
        >
          {selected ? <span aria-hidden>✓ {label}</span> : <span aria-hidden>+</span>}
        </button>
      </li>
    );
  }

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
  const design = useDesign();
  return (
    <li
      className={`text-xs tracking-widest text-muted uppercase rtl:tracking-normal ${
        design === "chips" ? "flex items-center" : ""
      }`}
    >
      {children}
    </li>
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
  onPlace,
  placeDisabled,
}: {
  cards: readonly T[];
  cardKey: (card: T) => string;
  renderCard: (card: T, index: number) => ReactNode;
  /** Shown after the last card (and its gap). */
  after?: ReactNode;
  canPlace: boolean;
  selected: number | null;
  onSelect: (slot: number) => void;
  /** Places the song in a gap (used by layouts that place from the gap itself). */
  onPlace?: (slot: number) => void;
  placeDisabled?: boolean;
}) {
  const { t } = useI18n();
  const design = useDesign();
  const gap = (slot: number) =>
    canPlace && (
      <SlotButton
        label={slotLabel(cards, slot, t.slots)}
        selected={selected === slot}
        onClick={() => onSelect(slot)}
        onPlace={onPlace && (() => onPlace(slot))}
        placeDisabled={placeDisabled}
      />
    );
  const listClass = {
    classic: "flex flex-col gap-2",
    dock: "flex flex-col gap-2",
    compact: "flex flex-col gap-1",
    chips: "flex flex-wrap items-stretch gap-1.5",
  }[design];
  return (
    <ol className={listClass}>
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
  // The compact layout places from the chosen gap itself.
  if (useDesign() === "compact") return null;
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
  const design = useDesign();
  const variantClass = { plain: "", good: "card-good", bad: "card-bad" }[variant];
  if (design === "chips") {
    return (
      <li
        className={`card flex max-w-36 min-w-0 flex-col justify-center px-2.5 py-1 ${variantClass}`}
      >
        <span className="text-base leading-tight font-bold tabular-nums">{song.year}</span>
        <ChipTitle song={song} />
        {note && <span className="text-[10px] leading-tight">{note}</span>}
      </li>
    );
  }
  if (design === "compact") {
    return (
      <li className={`card flex items-center gap-2 px-3 py-1.5 ${variantClass}`}>
        <div className="w-11 shrink-0 text-center text-base font-bold tabular-nums">
          {song.year}
        </div>
        <InlineReveal song={song} />
        {note && <span className="ms-auto shrink-0 text-xs">{note}</span>}
      </li>
    );
  }
  return (
    <li className={`card flex items-center gap-3 p-3 ${variantClass}`}>
      <CardYear year={song.year} />
      <SongReveal {...song} />
      {note && <span className="ms-auto shrink-0 text-xs">{note}</span>}
    </li>
  );
}

/** A song's title (linked to YouTube) on one line, for small chips. */
function ChipTitle({ song }: { song: { title: string; artist: string; youtubeId: string } }) {
  const { lang } = useI18n();
  const { title } = songNames(song, lang);
  const youtubeId = getSong(song.youtubeId)?.youtubeId ?? song.youtubeId;
  return (
    <ExternalLink
      href={`https://www.youtube.com/watch?v=${youtubeId}`}
      className="truncate text-xs text-muted hover:text-white"
    >
      <bdi>{title}</bdi>
    </ExternalLink>
  );
}

/** Title · artist on a single line (linked to YouTube), for slim rows. */
function InlineReveal({ song }: { song: { title: string; artist: string; youtubeId: string } }) {
  const { lang } = useI18n();
  const { title, artist } = songNames(song, lang);
  const youtubeId = getSong(song.youtubeId)?.youtubeId ?? song.youtubeId;
  return (
    <ExternalLink
      href={`https://www.youtube.com/watch?v=${youtubeId}`}
      className="min-w-0 truncate text-sm hover:underline"
    >
      <bdi className="font-semibold">{title}</bdi>{" "}
      <span className="text-muted">
        · <bdi>{artist}</bdi>
      </span>
    </ExternalLink>
  );
}

export function AnchorCard({ year }: { year: number }) {
  const { t } = useI18n();
  const design = useDesign();
  if (design === "chips") {
    return (
      <li className="card card-anchor flex flex-col justify-center px-2.5 py-1">
        <span className="text-base leading-tight font-bold tabular-nums">{year}</span>
        <span className="text-xs text-muted">{t.common.startingYear}</span>
      </li>
    );
  }
  return (
    <li
      className={`card card-anchor flex items-center ${design === "compact" ? "gap-2 px-3 py-1.5" : "gap-3 p-3"}`}
    >
      {design === "compact" ? (
        <div className="w-11 shrink-0 text-center text-base font-bold tabular-nums">{year}</div>
      ) : (
        <CardYear year={year} />
      )}
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

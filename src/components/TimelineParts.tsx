"use client";

import SongReveal from "@/components/SongReveal";
import { useI18n } from "@/i18n/I18nProvider";

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

export function SongCard({
  song,
  variant,
  note,
}: {
  song: { title: string; artist: string; year: number; youtubeId: string };
  variant: "plain" | "good" | "bad";
  note?: string;
}) {
  return (
    <li
      className={`card flex items-center gap-3 p-3 ${
        variant === "good" ? "card-good" : variant === "bad" ? "card-bad" : ""
      }`}
    >
      <div className="w-14 shrink-0 text-center text-xl font-bold tabular-nums">{song.year}</div>
      <SongReveal {...song} />
      {note && <span className="ms-auto shrink-0 text-xs">{note}</span>}
    </li>
  );
}

export function AnchorCard({ year }: { year: number }) {
  const { t } = useI18n();
  return (
    <li className="card card-anchor flex items-center gap-3 p-3">
      <div className="w-14 shrink-0 text-center text-xl font-bold tabular-nums">{year}</div>
      <div className="text-sm text-muted">{t.common.startingYear}</div>
    </li>
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

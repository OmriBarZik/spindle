import SongReveal from "@/components/SongReveal";

export function SlotButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
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
        {selected ? `🎵 Song goes here · ${label}` : `+ ${label}`}
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
      {note && <span className="ml-auto shrink-0 text-xs">{note}</span>}
    </li>
  );
}

export function AnchorCard({ year }: { year: number }) {
  return (
    <li className="card card-anchor flex items-center gap-3 p-3">
      <div className="w-14 shrink-0 text-center text-xl font-bold tabular-nums">{year}</div>
      <div className="text-sm text-muted">Starting year</div>
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

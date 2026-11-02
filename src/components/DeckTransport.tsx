"use client";

import { useI18n } from "@/i18n/I18nProvider";

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The deck's label, the time played and Restart. With the small record they share one row. */
export function DeckTransport({
  label,
  time,
  small,
  onRestart,
}: {
  label?: string;
  /** Seconds played of this deck's song, or null while another song is loaded. */
  time: number | null;
  small: boolean;
  onRestart: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className={small ? "flex items-center gap-200" : "contents"}>
      {label ? (
        <div className="mt-50 text-xs font-bold tracking-widest text-muted uppercase rtl:tracking-normal">
          {label}
        </div>
      ) : null}
      <div className="flex items-center gap-150 text-sm text-muted">
        <span dir="ltr" className="w-600 text-end font-mono tabular-nums">
          {formatTime(time ?? 0)}
        </span>
        <button
          type="button"
          disabled={time === null}
          onClick={onRestart}
          className="rounded-full border border-line px-150 py-50 transition hover:bg-hover disabled:opacity-40"
        >
          {t.common.restart}
        </button>
      </div>
    </div>
  );
}

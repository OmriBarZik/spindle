"use client";

import { clsx } from "clsx";
import type { Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";

/** Turns one kind of song on or off. `locked`: it's the last one on, so it can't go off. */
export function SongLanguageSwitch({
  language,
  on,
  locked,
  count,
  onToggle,
}: {
  language: Locale;
  on: boolean;
  locked: boolean;
  count: number;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  const id = `songs-${language}`;
  const kind = t.settings.kinds[language];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={`${id}-name`}
      aria-describedby={`${id}-desc`}
      disabled={locked}
      title={locked ? t.settings.lastOne : undefined}
      onClick={onToggle}
      className="flex w-full items-center gap-4 rounded-xl border border-line p-3 text-start transition hover:bg-white/5 disabled:cursor-not-allowed disabled:hover:bg-transparent"
    >
      <span className="min-w-0 flex-1">
        <span id={`${id}-name`} className="block font-semibold">
          {kind.name}
        </span>
        <span id={`${id}-desc`} className="block text-sm text-muted">
          {kind.desc} · {t.settings.count(count)}
        </span>
      </span>
      {/* The knob slides toward the "end" side, so it mirrors in RTL. */}
      <span
        aria-hidden
        className={clsx(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          on ? "bg-green-500" : "bg-white/15",
          locked && "opacity-60",
        )}
      >
        <span
          className={clsx(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
            on ? "start-6" : "start-1",
          )}
        />
      </span>
    </button>
  );
}

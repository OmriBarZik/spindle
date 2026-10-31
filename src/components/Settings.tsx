"use client";

import Link from "next/link";
import { localePath } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { SONG_LANGUAGES, songLanguage, SONGS } from "@/lib/songs";
import { setSongLanguage } from "@/lib/storage";
import { useSave } from "@/lib/useSave";

const COUNTS = Object.fromEntries(
  SONG_LANGUAGES.map((l) => [l, SONGS.filter((s) => songLanguage(s) === l).length]),
) as Record<(typeof SONG_LANGUAGES)[number], number>;

export default function Settings() {
  const { lang, t } = useI18n();
  const [data, update] = useSave();
  const chosen = data.settings.songLanguages;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16">
      <h1 className="text-center text-2xl font-bold">{t.settings.name}</h1>

      <section className="card flex flex-col gap-4 p-5">
        <div>
          <h2 className="text-lg font-bold">{t.settings.songsHeading}</h2>
          <p className="mt-1 text-sm text-muted">{t.settings.songsIntro}</p>
        </div>

        <ul className="flex flex-col gap-2">
          {SONG_LANGUAGES.map((l) => {
            const on = chosen.includes(l);
            const locked = on && chosen.length === 1;
            const id = `songs-${l}`;
            return (
              <li key={l}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-labelledby={`${id}-name`}
                  aria-describedby={`${id}-desc`}
                  disabled={locked}
                  title={locked ? t.settings.lastOne : undefined}
                  onClick={() => update((d) => setSongLanguage(d, l, !on))}
                  className="flex w-full items-center gap-4 rounded-xl border border-line p-3 text-start transition hover:bg-white/5 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <span className="min-w-0 flex-1">
                    <span id={`${id}-name`} className="block font-semibold">
                      {t.settings.kinds[l].name}
                    </span>
                    <span id={`${id}-desc`} className="block text-sm text-muted">
                      {t.settings.kinds[l].desc} · {t.settings.count(COUNTS[l])}
                    </span>
                  </span>
                  {/* The knob slides toward the "end" side, so it mirrors in RTL. */}
                  <span
                    aria-hidden
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                      on ? "bg-green-500" : "bg-white/15"
                    } ${locked ? "opacity-60" : ""}`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                        on ? "start-6" : "start-1"
                      }`}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Fixed height so the page doesn't jump when the hint appears. */}
        <p role="status" aria-live="polite" className="min-h-5 text-sm leading-5 text-amber-300">
          {chosen.length === 1 ? t.settings.lastOne : ""}
        </p>
        <p className="text-sm text-muted">{t.settings.applyNote}</p>
      </section>

      <Link href={localePath(lang, "/")} className="text-center text-sm text-muted underline">
        {t.settings.back}
      </Link>
    </main>
  );
}

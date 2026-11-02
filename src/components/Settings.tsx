"use client";

import Link from "next/link";
import { ScreenMain } from "@/components/ScreenMain";
import { SongLanguageSwitch } from "@/components/SongLanguageSwitch";
import { useSave } from "@/hooks/useSave";
import { type Locale, localePath, LOCALES } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { track } from "@/lib/analytics";
import { songLanguage, SONGS } from "@/lib/songs";
import { setSongLanguage } from "@/lib/storage";

const COUNTS = Object.fromEntries(
  LOCALES.map((l) => [l, SONGS.filter((s) => songLanguage(s) === l).length]),
) as Record<Locale, number>;

export function Settings() {
  const { lang, t } = useI18n();
  const [data, update] = useSave();
  const chosen = data.settings.songLanguages;

  return (
    <ScreenMain>
      <h1 className="text-center text-2xl font-bold">{t.settings.name}</h1>

      <section className="card flex flex-col gap-200 p-250">
        <div>
          <h2 className="text-lg font-bold">{t.settings.songsHeading}</h2>
          <p className="mt-50 text-sm text-muted">{t.settings.songsIntro}</p>
        </div>

        <ul className="flex flex-col gap-100">
          {LOCALES.map((l) => {
            const on = chosen.includes(l);
            return (
              <li key={l}>
                <SongLanguageSwitch
                  language={l}
                  on={on}
                  locked={on && chosen.length === 1}
                  count={COUNTS[l]}
                  onToggle={() => {
                    update((d) => setSongLanguage(d, l, !on));
                    track("song_languages_change", { song_language: l, enabled: !on });
                  }}
                />
              </li>
            );
          })}
        </ul>

        {/* Fixed height so the page doesn't jump when the hint appears. */}
        <p
          role="status"
          aria-live="polite"
          className="min-h-250 text-sm leading-250 text-warning-ink"
        >
          {chosen.length === 1 ? t.settings.lastOne : ""}
        </p>
        <p className="text-sm text-muted">{t.settings.applyNote}</p>
      </section>

      <Link href={localePath(lang, "/")} className="text-center text-sm text-muted underline">
        {t.settings.back}
      </Link>
    </ScreenMain>
  );
}

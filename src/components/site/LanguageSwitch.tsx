"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { languageName, LOCALE_COOKIE, localePath, LOCALES } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { track } from "@/lib/services/analytics";
import { holdPlayer } from "@/lib/services/player";

/** English / עברית toggle. Remembers the choice so unprefixed links open in it. */
export function LanguageSwitch({ path }: { path: string }) {
  const { lang, t } = useI18n();
  return (
    <nav
      aria-label={t.common.languageLabel}
      className="flex rounded-full border border-line p-25 text-xs"
    >
      {LOCALES.map((l) => (
        <Link
          key={l}
          href={localePath(l, path)}
          lang={l}
          hrefLang={l}
          aria-current={l === lang ? "true" : undefined}
          onClick={() => {
            if (l !== lang) {
              track("language_switch", { from: lang, to: l });
              // The page remounts in the other language: keep the song playing for it.
              holdPlayer();
            }
            document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
          }}
          className={clsx(
            "rounded-full px-100 py-50 transition",
            l === lang ? "bg-primary font-semibold text-on-primary" : "text-muted hover:text-ink",
          )}
        >
          {languageName(l)}
        </Link>
      ))}
    </nav>
  );
}

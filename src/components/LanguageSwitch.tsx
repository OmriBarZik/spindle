"use client";

import Link from "next/link";
import { LOCALE_COOKIE, localePath, LOCALES } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { MESSAGES } from "@/i18n/messages";
import { track } from "@/lib/analytics";

/** English / עברית toggle. Remembers the choice so unprefixed links open in it. */
export default function LanguageSwitch({ path }: { path: string }) {
  const { lang, t } = useI18n();
  return (
    <nav
      aria-label={t.common.languageLabel}
      className="flex rounded-full border border-line p-0.5 text-xs"
    >
      {LOCALES.map((l) => (
        <Link
          key={l}
          href={localePath(l, path)}
          lang={l}
          hrefLang={l}
          aria-current={l === lang ? "true" : undefined}
          onClick={() => {
            if (l !== lang) track("language_switch", { from: lang, to: l });
            document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
          }}
          className={`rounded-full px-2.5 py-1 transition ${
            l === lang ? "bg-white font-semibold text-black" : "text-muted hover:text-white"
          }`}
        >
          {MESSAGES[l].langName}
        </Link>
      ))}
    </nav>
  );
}

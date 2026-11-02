export type Locale = "en" | "he";

type Language = {
  /** Shown in the language switch, in the language itself. */
  name: string;
  dir: "ltr" | "rtl";
  /** Other codes browsers send for this language. */
  aliases?: readonly string[];
};

/**
 * The one place that knows which languages the site supports. Song pools, saves, routes
 * and the language switch all read from here. To add a language, add it to `Locale`:
 * the types then point at everything else that needs it (this table, `MESSAGES`, …).
 *
 * The order matters: the daily picks go through languages in this order, so reordering
 * it would change everyone's puzzles.
 */
const LANGUAGES: Record<Locale, Language> = {
  en: { name: "English", dir: "ltr" },
  // "iw" is the legacy code for Hebrew that some browsers still send.
  he: { name: "עברית", dir: "rtl", aliases: ["iw"] },
};

export const LOCALES = Object.keys(LANGUAGES) as readonly Locale[];

/**
 * Every language lives under its own prefix (`/en/sort`, `/he/sort`); neither is
 * "the default". This is only used when nothing tells us what the player prefers.
 */
export const FALLBACK_LOCALE: Locale = "en";

/** Cookie that remembers the language a player picked with the switcher. */
export const LOCALE_COOKIE = "spindle-lang";

export const hasLocale = (value: string | null | undefined): value is Locale =>
  (LOCALES as readonly string[]).includes(value ?? "");

export const dirOf = (lang: Locale): Language["dir"] => LANGUAGES[lang].dir;

export const languageName = (lang: Locale): string => LANGUAGES[lang].name;

/** `generateStaticParams` for everything under `[lang]`. */
export const localeParams = (): { lang: Locale }[] => LOCALES.map((lang) => ({ lang }));

/** Public URL of an app path in a language: `localePath("he", "/sort")` → `/he/sort`. */
export function localePath(lang: Locale, path: string): string {
  return path === "/" ? `/${lang}` : `/${lang}${path}`;
}

/** Splits a language prefix off a URL path: `/he/sort` → `["he", "/sort"]`. */
export function splitLocale(pathname: string): [Locale | null, string] {
  const first = pathname.split("/")[1];
  if (!hasLocale(first)) {
    return [null, pathname];
  }
  return [first, pathname.slice(first.length + 1) || "/"];
}

/** Picks a supported language from an Accept-Language header (by q-value, then order). */
export function matchAcceptLanguage(header: string | null): Locale | null {
  if (!header) {
    return null;
  }
  const ranked = header
    .split(",")
    .map((part, i) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.slice(2)) : 1, i };
    })
    .filter((x) => x.tag && x.q > 0)
    .toSorted((a, b) => b.q - a.q || a.i - b.i);
  for (const { tag } of ranked) {
    const base = tag.split("-")[0] ?? "";
    const lang = LOCALES.find((l) => l === base || LANGUAGES[l].aliases?.includes(base));
    if (lang) {
      return lang;
    }
  }
  return null;
}

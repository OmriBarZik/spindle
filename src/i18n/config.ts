export const LOCALES = ["en", "he"] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * Every language lives under its own prefix (`/en/sort`, `/he/sort`); neither is
 * "the default". This is only used when nothing tells us what the player prefers.
 */
export const FALLBACK_LOCALE: Locale = "en";

/** Cookie that remembers the language a player picked with the switcher. */
export const LOCALE_COOKIE = "spindle-lang";

export const hasLocale = (value: string | null | undefined): value is Locale =>
  (LOCALES as readonly string[]).includes(value ?? "");

export const dirOf = (lang: Locale): "ltr" | "rtl" => (lang === "he" ? "rtl" : "ltr");

/** Public URL of an app path in a language: `localePath("he", "/sort")` → `/he/sort`. */
export function localePath(lang: Locale, path: string): string {
  return path === "/" ? `/${lang}` : `/${lang}${path}`;
}

/** Splits a language prefix off a URL path: `/he/sort` → `["he", "/sort"]`. */
export function splitLocale(pathname: string): [Locale | null, string] {
  const first = pathname.split("/")[1];
  if (!hasLocale(first)) return [null, pathname];
  return [first, pathname.slice(first.length + 1) || "/"];
}

/** Picks a supported language from an Accept-Language header (by q-value, then order). */
export function matchAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part, i) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.slice(2)) : 1, i };
    })
    .filter((x) => x.tag && x.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    // "iw" is the legacy code for Hebrew that some browsers still send.
    const lang = base === "iw" ? "he" : base;
    if (hasLocale(lang)) return lang;
  }
  return null;
}

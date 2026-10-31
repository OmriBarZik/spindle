import { type NextRequest, NextResponse } from "next/server";
import {
  FALLBACK_LOCALE,
  hasLocale,
  LOCALE_COOKIE,
  localePath,
  matchAcceptLanguage,
  splitLocale,
} from "@/i18n/config";

/**
 * Every page lives under a language prefix (`/en/...` or `/he/...`). A URL without one
 * (`/`, or an old `/sort` link) is sent to the language the player picked before (cookie),
 * else the browser's language, else English.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const [lang] = splitLocale(pathname);
  if (lang) return NextResponse.next();

  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const preferred = hasLocale(cookie)
    ? cookie
    : (matchAcceptLanguage(request.headers.get("accept-language")) ?? FALLBACK_LOCALE);

  const url = request.nextUrl.clone();
  url.pathname = localePath(preferred, pathname);
  url.search = search;
  const res = NextResponse.redirect(url);
  res.headers.set("Vary", "Cookie, Accept-Language");
  return res;
}

export const config = {
  // Pages only: skip Next internals and files with an extension (favicon, images, …).
  matcher: ["/((?!_next/|.*\\.[\\w]+$).*)"],
};

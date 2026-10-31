"use client";

import { createContext, useContext } from "react";
import { dirOf, type Locale } from "./config";
import { MESSAGES } from "./messages";

const I18nContext = createContext<Locale>("en");

/** Gives client components the page's language. Mounted once in the root layout. */
export function I18nProvider({ lang, children }: { lang: Locale; children: React.ReactNode }) {
  return <I18nContext.Provider value={lang}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const lang = useContext(I18nContext);
  return { lang, dir: dirOf(lang), t: MESSAGES[lang] };
}

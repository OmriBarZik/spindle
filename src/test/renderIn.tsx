import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import type { Locale } from "@/i18n/config";
import { I18nProvider } from "@/i18n/I18nProvider";

export function renderIn(lang: Locale, ui: ReactElement) {
  return render(<I18nProvider lang={lang}>{ui}</I18nProvider>);
}

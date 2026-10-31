import { notFound } from "next/navigation";
import { lang as langParam } from "next/root-params";
import { hasLocale } from "./config";
import { MESSAGES } from "./messages";

/** The current page's language and messages, for Server Components. */
export async function getI18n() {
  const lang = await langParam();
  if (!hasLocale(lang)) notFound();
  return { lang, t: MESSAGES[lang] };
}

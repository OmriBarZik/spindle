import Link from "next/link";
import LanguageSwitch from "@/components/LanguageSwitch";
import { localePath } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

/** `path` is the current page without its language prefix, for the language switch. */
export default async function Header({ title, path }: { title?: string; path: string }) {
  const { lang, t } = await getI18n();
  return (
    <header className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 py-4">
      <Link
        href={localePath(lang, "/")}
        className="flex items-center gap-2 font-bold tracking-tight"
      >
        <span className="mini-record" aria-hidden />
        Spindle
      </Link>
      <div className="flex items-center gap-2">
        {/* Hidden on phones to fit the switch and settings; each page repeats it in its <h1>. */}
        {title && <span className="hidden text-sm text-muted sm:inline">{title}</span>}
        <LanguageSwitch path={path} />
        {path !== "/settings" && (
          <Link
            href={localePath(lang, "/settings")}
            aria-label={t.settings.name}
            title={t.settings.name}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
        )}
      </div>
    </header>
  );
}

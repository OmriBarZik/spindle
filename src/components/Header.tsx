import Link from "next/link";
import LanguageSwitch from "@/components/LanguageSwitch";
import { localePath } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

/** `path` is the current page without its language prefix, for the language switch. */
export default async function Header({ title, path }: { title?: string; path: string }) {
  const { lang } = await getI18n();
  return (
    <header className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 py-4">
      <Link href={localePath(lang, "/")} className="flex items-center gap-2 font-bold tracking-tight">
        <span className="mini-record" aria-hidden />
        Spindle
      </Link>
      <div className="flex items-center gap-3">
        {title && <span className="text-sm text-muted">{title}</span>}
        <LanguageSwitch path={path} />
      </div>
    </header>
  );
}

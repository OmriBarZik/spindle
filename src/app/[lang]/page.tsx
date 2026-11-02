import { ExternalLink } from "@/components/ExternalLink";
import { Header } from "@/components/Header";
import { WeekStripClient } from "@/components/LazyScreens";
import { ModeSleeve } from "@/components/ModeSleeve";
import { localePath } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

export default async function Home() {
  const { lang, t } = await getI18n();
  return (
    <>
      <Header path="/" />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16">
        <section className="flex flex-col gap-3 px-1 pt-4">
          <h1 className="max-w-xs text-4xl leading-[1.05] font-black tracking-tight text-balance rtl:tracking-normal">
            {t.home.headline}
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-muted">{t.home.tagline}</p>
        </section>

        <nav aria-label={t.home.modesLabel} className="grid grid-cols-2 gap-3">
          <ModeSleeve
            href={localePath(lang, "/sort")}
            tone="violet"
            tag={t.home.sortTag}
            name={t.sort.name}
            desc={t.home.sortDesc}
          />
          <ModeSleeve
            href={localePath(lang, "/marathon")}
            tone="amber"
            tag={t.home.marathonTag}
            name={t.marathon.name}
            desc={t.home.marathonDesc}
            badge={t.home.newBadge}
          />
        </nav>

        <WeekStripClient />

        <details className="card group p-5">
          <summary className="cursor-pointer text-lg font-bold">{t.home.howTo}</summary>
          <ul className="mt-3 flex list-disc flex-col gap-2 ps-5 text-sm text-muted">
            {t.home.rules.map((rule, i) => (
              // A fixed list that never reorders, so the index is a stable key.
              // oxlint-disable-next-line react/no-array-index-key
              <li key={i}>{rule}</li>
            ))}
          </ul>
        </details>

        <footer className="text-center text-xs text-muted">
          {t.home.footer}{" "}
          <ExternalLink href="https://github.com/OmriBarZik/spindle" className="underline">
            {t.home.github}
          </ExternalLink>
        </footer>
      </main>
    </>
  );
}

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
      <main className="mx-auto flex w-full max-w-page flex-col gap-300 px-200 pb-800">
        <section className="home-inset flex flex-col gap-150 pt-200">
          <h1 className="max-w-narrow text-4xl leading-450 font-black tracking-tight text-balance rtl:tracking-normal">
            {t.home.headline}
          </h1>
          <p className="max-w-prose text-sm leading-300 text-muted">{t.home.tagline}</p>
        </section>

        <nav aria-label={t.home.modesLabel} className="sleeves">
          <ModeSleeve
            href={localePath(lang, "/sort")}
            game="daily"
            tag={t.home.sortTag}
            name={t.sort.name}
            desc={t.home.sortDesc}
          />
          <ModeSleeve
            href={localePath(lang, "/marathon")}
            game="marathon"
            tag={t.home.marathonTag}
            name={t.marathon.name}
            desc={t.home.marathonDesc}
          />
        </nav>

        <WeekStripClient />

        <details className="card home-card group">
          <summary className="cursor-pointer text-lg font-bold">{t.home.howTo}</summary>
          <ul className="mt-150 flex list-disc flex-col gap-100 ps-250 text-sm text-muted">
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

import ExternalLink from "@/components/ExternalLink";
import Header from "@/components/Header";
import ModeLink from "@/components/ModeLink";
import { localePath } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

export default async function Home() {
  const { lang, t } = await getI18n();
  const modes = [
    { path: "/sort", icon: "🎚️", name: t.sort.name, desc: t.home.sortDesc },
    { path: "/timeline", icon: "📈", name: t.timeline.name, desc: t.home.timelineDesc },
  ];
  return (
    <>
      <Header path="/" />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 pb-16">
        <section className="flex flex-col items-center gap-4 pt-6 text-center">
          <div className="record spin-slow h-36 w-36 rounded-full" aria-hidden data-flight-record>
            <div className="record-label" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">Spindle</h1>
          <p className="max-w-sm text-muted">{t.home.tagline}</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {modes.map((mode) => (
            <ModeLink
              key={mode.path}
              href={localePath(lang, mode.path)}
              className="card mode-card group p-5"
            >
              <div aria-hidden className="text-3xl">
                {mode.icon}
              </div>
              <h2 className="mt-2 text-xl font-bold">{mode.name}</h2>
              <p className="mt-1 text-sm text-muted">{mode.desc}</p>
              <span className="mt-4 inline-block text-sm font-semibold group-hover:underline">
                {t.home.playCta}
              </span>
            </ModeLink>
          ))}
        </section>

        <section className="card p-5">
          <h2 className="text-lg font-bold">{t.home.howTo}</h2>
          <ul className="mt-3 flex list-disc flex-col gap-2 ps-5 text-sm text-muted">
            {t.home.rules.map((rule, i) => (
              // A fixed list that never reorders, so the index is a stable key.
              // eslint-disable-next-line react/no-array-index-key
              <li key={i}>{rule}</li>
            ))}
          </ul>
        </section>

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

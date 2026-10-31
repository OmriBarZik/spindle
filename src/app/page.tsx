import Link from "next/link";
import Header from "@/components/Header";

export default function Home() {
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 pb-16">
        <section className="flex flex-col items-center gap-4 pt-6 text-center">
          <div className="record spin-slow h-36 w-36 rounded-full" aria-hidden>
            <div className="record-label" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">Spindle</h1>
          <p className="max-w-sm text-muted">
            A daily music game. Listen to songs — no titles, no thumbnails — and figure out
            when they came out.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Link href="/sort" className="card mode-card group p-5">
            <div className="text-3xl">🎚️</div>
            <h2 className="mt-2 text-xl font-bold">Daily Sort</h2>
            <p className="mt-1 text-sm text-muted">
              Five songs. Put them in order from oldest to newest. Same songs for everyone.
            </p>
            <span className="mt-4 inline-block text-sm font-semibold group-hover:underline">
              Play →
            </span>
          </Link>
          <Link href="/timeline" className="card mode-card group p-5">
            <div className="text-3xl">📈</div>
            <h2 className="mt-2 text-xl font-bold">Daily Timeline</h2>
            <p className="mt-1 text-sm text-muted">
              One song a day. Slot it into your growing timeline. Every day you keep it alive,
              it gets harder.
            </p>
            <span className="mt-4 inline-block text-sm font-semibold group-hover:underline">
              Play →
            </span>
          </Link>
        </section>

        <section className="card p-5">
          <h2 className="text-lg font-bold">How to play</h2>
          <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm text-muted">
            <li>
              <b className="text-white">Daily Sort:</b> tap each song to listen, use ▲▼ to order
              them oldest → newest, then lock it in. Each song in the right spot is a 🟩.
            </li>
            <li>
              <b className="text-white">Daily Timeline:</b> on day 1 you get a free card (say,
              1997). On day 2 you choose <i>before 1997</i> or <i>after 1997</i>. Get it right
              and the card joins your timeline — day 3 might be <i>before 1997</i>,{" "}
              <i>1997–2000</i> or <i>after 2000</i>, and so on.
            </li>
            <li>
              A wrong guess — or a missed day — ends your timeline and a new one starts. Songs
              from the same year count either way.
            </li>
            <li>Everything is saved in your browser. A new day starts at your local midnight.</li>
          </ul>
        </section>

        <footer className="text-center text-xs text-muted">
          Songs play straight from YouTube; Spindle hosts no audio.{" "}
          <a
            href="https://github.com/OmriBarZik/spindle"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            Open source on GitHub
          </a>
        </footer>
      </main>
    </>
  );
}

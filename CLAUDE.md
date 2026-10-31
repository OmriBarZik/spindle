@AGENTS.md

# Spindle: notes for agents

Spindle is a daily music game that combines Hitster and Wordle. Players hear songs
(played from YouTube with the title hidden) and place them on a timeline by release year.
It is open source (MIT) and deployed on Vercel from `main` with no environment variables.

## Commands

```bash
npm run dev             # http://localhost:3000
npm test                # vitest: game-logic unit tests (src/lib/__tests__)
npm run lint            # eslint (includes React Compiler rules, see Gotchas)
npx tsc --noEmit        # typecheck
npm run build           # production build; all routes are static
npm run validate-songs  # checks every YouTube ID via oEmbed (needs youtube.com access)
```

Run lint, test and build before pushing.

## Game modes

| Mode | Route | Internal name | Rules |
| --- | --- | --- | --- |
| **Daily Five** | `/{lang}/sort` | "sort" (`SortGame`, `data.sort`, `sortSongsFor`) | The line starts with one **starting year**. Five songs come **one at a time**, and each is placed into a gap. A wrong placement is marked red and moved to its real spot. Score is x/5. Everyone gets the same songs each day. |
| **Daily Timeline** | `/{lang}/timeline` | "timeline" | One song per day goes into a personal timeline that persists across days. A new timeline starts with a free starting year, so day 1 is already a guess. A wrong guess or a missed day ends the run, and a fresh one starts the next day. |

The "sort" name is historical: the mode used to be "order all 5 at once". Keep the
internal names (route, save keys, functions) so existing saves and links keep working;
only the UI says "Daily Five".

| **Settings** | `/{lang}/settings` | `Settings` | Players choose which songs can appear: International (`en`) and/or Israeli (`he`) songs. Stored in `data.settings.songLanguages` (never empty). |

Shared rules:
- **Slot `i`** means "insert before `cards[i]`"; `slot === cards.length` is the end.
- **Equal years are correct on either side** (`isSlotCorrect` in `src/lib/timeline.ts`).
- A new day starts at the **player's local midnight** (`dayKey()` in `src/lib/dates.ts`).

## Languages (i18n)

The site is fully bilingual: **English (`en`) and Hebrew (`he`) are equal**. Neither one
is a "default" served without a prefix.

- Every page lives under `src/app/[lang]/` (`/en`, `/he/sort`, …). `[lang]/layout.tsx` is the
  root layout. It sets `<html lang dir>` (`rtl` for Hebrew) and statically generates both
  languages.
- `src/proxy.ts` redirects any URL without a prefix (`/`, or old `/sort` links) to the
  `spindle-lang` cookie's language (set by the header switch), else the browser's
  `Accept-Language`, else English.
- All UI text is in `src/i18n/messages.tsx` (one `Messages` object per language; the
  types force both languages to have every key). Server components use `getI18n()` from
  `src/i18n/server.ts`; client components use `useI18n()` from `src/i18n/I18nProvider.tsx`.
  **Never hard-code UI text in components**; add it to both languages.
- `slotLabel(cards, slot, t.slots)` takes the language's slot labels.
- Song names: use `songNames(song, lang)` (`src/lib/songs.ts`). It returns `titleHe`/`artistHe`
  on Hebrew pages, looked up by `youtubeId` because saved timeline cards only store English names.
- Saves are shared between languages, so switching language keeps progress.
- **RTL layout:** use logical utilities (`ms-*`, `ps-*`, `text-start`/`text-end`, `start-*`)
  instead of `ml`/`pl`/`text-left`, and the `rtl:` variant where needed (e.g.
  `rtl:tracking-normal`, since wide letter-spacing breaks Hebrew). Wrap Latin song
  titles and artists in `<bdi>` inside sentences. Media icons (the play triangle) and
  the clock stay left-to-right.
- Fonts: Roboto (and Roboto Mono) for Latin. Roboto has no Hebrew, so Heebo
  (`--font-hebrew`, Roboto's Hebrew companion) is the fallback for Hebrew glyphs.

## Architecture

- **No backend.** All state lives in `localStorage` under the key `spindle:v1`
  (`src/lib/storage.ts`). There are no accounts and no API routes.
- **Client-only game screens.** `src/app/[lang]/{sort,timeline}/page.tsx` are server components
  that render `SortGameClient` and `TimelineGameClient` from `src/components/ClientOnly.tsx`.
  These use `next/dynamic` with `ssr: false`, because the initial state reads
  `localStorage` and the local date. `ssr: false` is only allowed inside a client
  component, which is why `ClientOnly.tsx` exists.
- **Deterministic daily picks.** `src/lib/daily.ts` runs `seededShuffle(SONGS, seed)`
  (`src/lib/random.ts`, FNV-1a + mulberry32) with these seed strings:
  `sort:${day}`, `anchor:${day}`, `timeline:${day}`, `timeline-anchor:${day}`.
  `shuffled()` in `daily.ts` splits that shuffle by song language and interleaves the
  lists with a seeded 50/50 coin (seed `${seed}:mix`), so with both kinds on about half the
  picks are Israeli even though the catalog is mostly international. The song-language
  setting only chooses which lists take part; it never changes the seed. So everyone with both kinds on (the default) shares one puzzle,
  and players with the same setting match each other. A Daily Five day remembers its
  `languages` and is re-picked only while no song has been placed; a pending Timeline song
  in a turned-off language is swapped. Share text says "Israeli songs only" etc. when the
  puzzle came from one kind.
  **Never change these strings or the shuffle algorithm**: doing so changes everyone's
  past and future puzzles. Editing `songs.json` also reshuffles the picks, so add songs
  rather than reorder or remove them, and avoid doing it mid-day.
- **Pure state transitions.** Every game action is a pure function
  `(SaveData, day, ...) => SaveData` in `storage.ts`, for example `ensureSortDay`,
  `placeSortSong`, `ensureTimelineDay`, `placeTimelineCard` and `skipTimelineSong`.
  A no-op returns the **same object** (the tests check identity). Components call them
  through `useSave()` (`src/lib/useSave.ts`), which persists only when the object changes.

### File map

| Path | What |
| --- | --- |
| `src/data/songs.json` | Song catalog: `{ artist, title, year, youtubeId, start?, titleHe?, artistHe? }`. The `id` is the `youtubeId`. One shared pool: Israeli songs (with Hebrew names) sit alongside the rest, so both languages get the same daily puzzle. |
| `src/lib/songs.ts` | Loads the catalog; `getSong(id)` |
| `src/lib/daily.ts` | Daily song and starting-year selection |
| `src/lib/storage.ts` | Save format, migrations-on-load, all state transitions, stats |
| `src/lib/timeline.ts` | `TimelineCard`, `anchorCard`, `songCount`, `isSlotCorrect`, `correctSlot`, `slotLabel` |
| `src/lib/youtube.ts` | `useHiddenPlayer()`: YouTube IFrame API wrapper |
| `src/components/Deck.tsx` | Turntable UI: opaque record over the hidden iframe, play/pause, loading ring, status line |
| `src/components/SortGame.tsx` | Daily Five screen |
| `src/components/TimelineGame.tsx` | Daily Timeline screen |
| `src/components/TimelineParts.tsx` | Shared `SlotButton`, `SongCard`, `AnchorCard`, `Stats` |
| `src/i18n/` | Locale config, `messages.tsx` (all UI text), `I18nProvider`/`useI18n`, `getI18n` |
| `src/proxy.ts` | Redirects unprefixed URLs to the player's language |
| `src/components/Settings.tsx` | Settings page (song-language switches) |
| `src/components/LanguageSwitch.tsx` | English / עברית toggle in the header |
| `src/app/[lang]/opengraph-image.tsx` | Link preview image (the record + "Spindle"), drawn with `next/og` as SVG and prerendered per language |
| `src/app/globals.css` | Theme tokens and custom classes (`.card`, `.btn-primary`, `.record`, `.loading-ring`, …) |
| `scripts/validate-songs.mjs` | oEmbed check for missing or non-embeddable videos |

## Save format (`spindle:v1`)

- `sort.days[day]` = `{ anchorYear, songIds, placements: {slot, correct}[] }`. The day is
  done when `placements.length === songIds.length` (`sortDayDone`). `sortLine(sortDay)` rebuilds the visible
  line: the anchor plus placed songs, with wrong ones moved to their correct position.
- `timeline.cards` is a `TimelineCard[]` **that includes the starting-year card**
  (`anchor: true`, `id: "anchor:<year>"`). Always use `songCount(cards)` for scores,
  "best", and share text; never use `cards.length`.
- `timeline.today` = `{ date, songId, skipped, result: "pending" | "correct" | "wrong" }`.
  Today's song is locked in the save when the day is first opened.
- **Be backward compatible.** Players already have saves. `loadSave()` merges with
  defaults, `ensureSortDay` replaces old-format days, and `ensureTimelineDay` adds a
  starting year to old mid-turn saves. Follow that pattern rather than bumping the version,
  which would wipe everyone's progress.

## YouTube player rules (product requirement)

- The player must **never show the title, channel, thumbnail, comments, or related
  videos** before the player has answered. The iframe is mounted into `hostRef` underneath
  an opaque `.record` div, uses `controls: 0`, and is driven only by our buttons. Don't
  make the iframe visible, and don't show song info before the answer.
- Spindle hosts no audio; songs only stream from YouTube.
- `useHiddenPlayer()` returns `{ hostRef, player }` **separately**. Putting the ref inside
  the player object trips the `react-hooks/refs` lint rule ("Cannot access refs during
  render").
- **Avoid layout shift.** The ring is always mounted and fades with opacity. The status
  line under the record has a fixed height (`h-5`). Keep it that way, since the user
  explicitly asked for no jumps.
- **Result animation:** after a guess, `Deck`'s `swap` prop makes the record glow green or red.
  In Daily Five it then swipes out in the reading direction (`--dir`, flipped under
  `[dir="rtl"]`) and the next record slides in. Play and "Place it" stay locked until
  `onSwapEnd`. The player, record and button move together so the iframe stays covered.
- If a video fails (`status === "error"`), Timeline offers "Give me a different song"
  (`skipTimelineSong`).

## Gotchas

- **Next.js 16** with `cacheComponents` enabled. APIs differ from older versions, so read
  `node_modules/next/dist/docs/` before using unfamiliar APIs (see AGENTS.md).
- The **React Compiler lint rules** are strict. Avoid `setState` inside effects and ref
  access during render. Prefer lazy `useState(() => ...)` initialisers in `ssr: false`
  components.
- **Tailwind v4.** `.card` and the other classes in `globals.css` are unlayered, so they
  **beat Tailwind utilities**. To change a card's border or background, add a custom class
  (like `.card-good`, `.card-bad` or `.card-anchor`) instead of utility classes.
- **CSS minifier:** in `globals.css`, an `animation` shorthand without a name is
  minified to `animation: none`. Use longhands (`animation-duration`, …) when the name is set
  by another class, and check the built CSS in `.next/static/chunks/*.css`.
- The site has a dark theme only.
- **Song years** are the original release year of the song (single or album), not the
  video or a remaster.

## Testing tips

- Put logic tests in `src/lib/__tests__/` (vitest, node environment, `@/` alias set in
  `vitest.config.mts`).
- For UI checks, use the pre-installed Playwright/Chromium against `next start`. YouTube
  may be blocked in sandboxes, so stub the API with
  `page.route('https://www.youtube.com/iframe_api', r => r.fulfill({ contentType: 'text/javascript', body: FAKE }))`,
  where `FAKE` defines `window.YT.Player` and calls `window.onYouTubeIframeAPIReady()`.
- To simulate later days, use `page.clock.setSystemTime(new Date('2026-11-02T10:00:00'))`
  and reload.

## Git workflow

- Feature work goes on a branch and is merged into `main` by PR. `main` deploys to
  production on Vercel, and other branches get preview URLs.
- Don't commit model identifiers.

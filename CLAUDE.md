@AGENTS.md

# Spindle: notes for agents

Spindle is a daily music game that combines Hitster and Wordle. Players hear songs
(played from YouTube with the title hidden) and place them on a timeline by release year.
It is open source (MIT) and deployed on Vercel from `main` with no environment variables.
Production runs **Node 26**: `engines.node` in `package.json` (`26.x`) sets it for Vercel and
CI (`node-version-file`), and `@types/node` matches it. Change all of them together.

## Commands

```bash
pnpm install            # install dependencies (pnpm is pinned in package.json's packageManager)
pnpm dev                # http://localhost:3000
pnpm test               # vitest projects: unit (node), lint-rules, browser (Chromium) and performance (Chromium on a slowed CPU)
pnpm lint               # oxlint (.oxlintrc.json): React Compiler rules, type-aware TS, jsx-a11y, Next.js
pnpm lint:css           # stylelint (.stylelintrc.json): every style on the design tokens
pnpm lint:fix           # oxlint --fix and stylelint --fix
pnpm format             # oxfmt (.oxfmtrc.json): also sorts imports and Tailwind classes
pnpm typecheck          # next typegen + tsc --noEmit (TypeScript 7, the native compiler)
pnpm knip               # unused files, exports and dependencies
pnpm check              # format check + lint + CSS lint + knip + typecheck + tests (what CI runs, minus the build)
pnpm build              # production build; all routes are static
pnpm validate-songs     # checks every YouTube ID via oEmbed (needs youtube.com access; Node runs the .mts directly)
```

Run `pnpm check` and `pnpm build` before pushing. CI (`.github/workflows/ci.yml`)
runs format, lint, CSS lint, knip, typecheck, tests and build on every PR and on `main`.

**On a remote or cloud machine (e.g. Claude Code on the web), skip the CPU check.** The
`performance` project times swipes on a throttled CPU, and shared machines are too noisy for it:
it fails there even on an untouched `main`. Run the other checks one by one and test with
`pnpm vitest run --project '!performance-*'`; CI runs the performance test on every PR.

## Styling: design tokens only

All styles come from `src/app/styles/tokens.css`. Nothing else holds a raw colour, length or
duration, and the linters enforce it.

- **Spacing is named in hundreds on a 4px grid:** `--spacing-100` = 0.5rem (8px), `50` = 4px,
  `150` = 12px, `200` = 1rem. Tailwind uses the same scale (`p-100`, `gap-150`, `w-600`,
  `-inset-150`); Tailwind's own numbers (`p-3`) are switched off. `25` (2px) is only for hairlines
  and optical nudges. The root font size stays 16px. Component sizes (`--swipe-*`, `--size-record*`,
  …) are built from spacing tokens (`var(--spacing-1300)`, `calc()` of them), never raw rem.
- **Colours have roles:** `page`, `surface`, `line`, `ink` / `muted` / `faint` (text), `hover`,
  `primary` (the main action: Place it, Share, play), `secondary` (Spindle's violet: focus, the line's
  glow, the starting year), `tertiary` (quiet fills: off, still to come), `success` / `danger` /
  `warning-ink`, `heart`, and one set per game mode: `daily`, `marathon`, `timeline` (sleeve colour,
  `-ink` for text on it, `-label` for its record). Use them as Tailwind classes (`bg-surface`,
  `text-muted`) or `var(--color-…)`. Raw colours live only in `--palette-*`.
- **Light and dark:** each themed role is `light-dark(light, dark)` and follows the system setting.
  A browser without `light-dark()` gets the dark values. The vinyl record stays black in both.
  Component tests run in both schemes (`browser-dark`, `browser-light`), so axe checks contrast in each.
- **Desktop (`lg:`, 64rem and up):** pages widen to `max-w-wide`. The home page becomes two
  columns (`.home` grid in `styles/home.css`: headline, "This week" and "How to play" beside bigger
  sleeves). A game screen's line uses the full width with bigger cards and record (the `--swipe-*`
  overrides under `@variant lg` in `tokens.css`), while its header, buttons and result stay in the
  narrow `max-w-page` column. Phones must look exactly as before.
- **Game colours:** a game screen passes `game` to `ScreenMain` (`.game-*` sets the record's label
  colour); a home sleeve passes `game` to `ModeSleeve`.
- **Lint:** stylelint (`stylelint-config-standard` plus `lint/stylelint-tokens.mjs`):
  `spindle/tokens-only` rejects raw colours outside `--palette-*`, lengths outside `--spacing-*`,
  `--text-*`, `--border-thin`/`--border-thick` and `--tracking-*`, and durations outside
  `--duration-*`; `spindle/spacing-grid` checks that `--spacing-N` is `N / 200` rem and on the 4px
  grid. In TS/TSX, oxlint's `spindle/no-raw-style` rejects hex/rgb colours, Tailwind's own colours
  (`text-white`), arbitrary values (`text-[13px]`) and off-scale spacing (`gap-3`). The only
  exception is `src/lib/palette.ts` (the link preview image and favicon can't read CSS).

## Game modes

| Mode | Route | Internal name | Rules |
| --- | --- | --- | --- |
| **Daily Five** | `/{lang}/sort` | "sort" (`SortGame`, `data.sort`, `sortSongsFor`) | The line starts with one **starting year**. Five songs come **one at a time**, and each is placed into a gap. A wrong placement is marked red and moved to its real spot. Score is x/5. Everyone gets the same songs each day. |
| **Marathon** | `/{lang}/marathon` | "marathon" (`MarathonGame`, `data.marathon`, `marathonSongsFor`) | Once a day. The line starts with one **starting year**, then songs come one at a time, as many as the player can place. Each wrong placement costs one of **3 hearts** (`MARATHON_HEARTS`) and the song is moved to its real spot; when the last heart goes, the day's score (songs placed right) is final. Everyone gets the same run of songs each day. |
| **Settings** | `/{lang}/settings` | `Settings` | Players choose which songs can appear: International (`en`) and/or Israeli (`he`) songs. Stored in `data.settings.songLanguages` (never empty). |

The "sort" name is historical: the mode used to be "order all 5 at once". Keep the
internal names (route, save keys, functions) so existing saves and links keep working;
only the UI says "Daily Five".

**Daily Timeline** (`/{lang}/timeline`, "timeline": one song a day on a personal timeline that
persists across days; a wrong guess or a missed day ends the run) is a **hidden page**. Its code
(`TimelineGame`, `timelineState.ts`, `data.timeline`) and tests stay, but nothing links to it, the
home page doesn't preload it, and it's marked `noindex`. It may come back later, so keep it working.

Shared rules:
- **Slot `i`** means "insert before `cards[i]`"; `slot === cards.length` is the end.
- **Desktop controls:** Space plays/pauses and Enter places, from anywhere on the page
  (`useKeyShortcut`; a focused button keeps its own keys), alongside the arrow keys, Home and End.
  With a mouse, the strip can be dragged, a click moves the record to the nearest gap
  (`useSwipeDrag`), and the wheel moves it one gap per notch (`useSwipeWheel`). `KeyHints` lists
  the keys under the place button, only for fine pointers. Every control has tests:
  `KeyboardControls`, `MouseControls`, `WheelControls` and `DesktopLayout` (at 1280px) in
  `src/components/__tests__/`, plus the arrow keys in `SortGame.test.tsx`. Add one with any new control.
- **Placing is swipe-then-tap.** The record always sits on a gap (it starts in the middle,
  `defaultSlot`), so the place button is ready at once and the whole line, record and button fit
  on one phone screen. Keep it that way: the player asked for no scrolling up and down.
- **Equal years are correct on either side** (`isSlotCorrect` in `src/lib/timeline.ts`).
  So neighbouring songs from the same year are one **stack** on the line (`SwipeStack`): one spot
  on the rail, the cards behind peeking out, a "1/2" button to flip, and no gap inside it.
  The strip counts gaps between stacks; `useStackedLine` converts them to card slots.
- A new day starts at the **player's local midnight** (`dayKey()` in `src/lib/dates.ts`).

## Languages (i18n)

The site is fully bilingual: **English (`en`) and Hebrew (`he`) are equal**. Neither one
is a "default" served without a prefix.

- `src/i18n/config.ts` is the **one place** that knows which languages exist: `Locale`, `LOCALES`,
  and each language's name, direction and aliases. Never write out the language list anywhere
  else; loop over `LOCALES`. Song pools use the same `Locale` codes, so `LOCALES` drives them too.
  **Don't reorder it**: the daily picks walk it in order, so that would change everyone's puzzles.

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
  (`src/lib/storage.ts`, with the shape in `src/lib/saveData.ts`). There are no accounts and no API routes.
- **Analytics.** Google Analytics 4 (`GA_MEASUREMENT_ID` in `src/components/GoogleAnalytics.tsx`,
  rendered by the root layout). Its init snippet is `beforeInteractive`, so `window.gtag` exists
  before the game screens mount. Custom events go through `track()` in `src/lib/analytics.ts`,
  whose `Events` type lists every event and its parameters (component tests check them with
  `trackedEvents()`). **Never send song details** (title, artist, year, video ID) to analytics.
- **Client-only game screens.** `src/app/[lang]/{sort,marathon}/page.tsx` are server components
  that render `SortGameClient` and `MarathonGameClient` from `src/components/LazyScreens.tsx`.
  The home page's "This week" strip (`WeekStripClient`) loads the same way.
  These use `next/dynamic` with `ssr: false`, because the initial state reads
  `localStorage` and the local date. `ssr: false` is only allowed inside a client
  component, which is why `LazyScreens.tsx` exists.
- **Deterministic daily picks.** `src/lib/daily.ts` runs `seededShuffle(SONGS, seed)`
  (`src/lib/random.ts`, FNV-1a + mulberry32) with these seed strings:
  `sort:${day}`, `anchor:${day}`, `marathon:${day}`, `marathon-anchor:${day}`.
  `timeline:${day}` and `timeline-anchor:${day}` (the hidden Daily Timeline).
  `shuffled()` in `daily.ts` splits that shuffle by song language and interleaves the
  lists with a seeded 50/50 coin (seed `${seed}:mix`), so with both kinds on about half the
  picks are Israeli even though the catalog is mostly international. The song-language
  setting only chooses which lists take part; it never changes the seed. So everyone with both kinds on (the default) shares one puzzle,
  and players with the same setting match each other. A Daily Five day remembers its
  `languages` and is re-picked only while no song has been placed, and so is a Marathon day.
  The Marathon plays the day's whole shuffle in order, minus the day's Daily Five songs. Share text says "Israeli songs only" etc. when the
  puzzle came from one kind.
  **Never change these strings or the shuffle algorithm**: doing so changes everyone's
  past and future puzzles. Editing `songs.json` also reshuffles the picks, so add songs
  rather than reorder or remove them, and avoid doing it mid-day.
- **Pure state transitions.** Every game action is a pure function
  `(SaveData, day, ...) => SaveData`, for example `ensureSortDay` and `placeSortSong` in
  `sortState.ts`, and `ensureMarathonDay`, `placeMarathonSong` and `skipMarathonSong` in
  `marathonState.ts`.
  A no-op returns the **same object** (the tests check identity). Components call them
  through `useSave()` (`src/hooks/useSave.ts`), which persists only when the object changes.

### File map

| Path | What |
| --- | --- |
| `src/data/songs.json` | Song catalog: `{ id?, artist, title, year, youtubeId, start?, titleHe?, artistHe? }`. The song `id` (stored in saves) is the `youtubeId`, unless the entry has its own `id`: when a video is swapped, keep the old video ID as `id` so saves keep working. Prefer audio-only uploads (an "Official Audio" or "- Topic" upload) over music videos and live clips, which often open with a long non-music intro. One shared pool: Israeli songs (with Hebrew names) sit alongside the rest, so both languages get the same daily puzzle. |
| `src/lib/songs.ts` | Loads the catalog; `getSong(id)` (finds a song by stable `id` or current `youtubeId`) |
| `src/lib/daily.ts` | Daily song and starting-year selection |
| `src/lib/saveData.ts` | The save format's types |
| `src/lib/storage.ts` | Reading and writing the save (migrations-on-load), `emptySave`, `setSongLanguage` |
| `src/lib/sortState.ts` | Daily Five: pure state transitions, stats, and what the screen shows (`sortView`, `sortLineItems`) |
| `src/lib/marathonState.ts` | Marathon: pure state transitions, hearts, stats and what the screen shows (`marathonView`) |
| `src/lib/timelineState.ts` | Daily Timeline (hidden page): pure state transitions and what the screen shows |
| `src/lib/timeline.ts` | `TimelineCard`, `LineItem`, `anchorCard`, `songCount`, `isSlotCorrect`, `correctSlot`, `defaultSlot`, `recordSlot`, `slotLabel` |
| `src/lib/week.ts` | `weekDays()`: the home page's "This week", Sunday to Saturday in reading direction (a day counts once any song was placed) |
| `src/lib/player.ts` | The one shared YouTube player: its hidden host on `<body>`, its state (a store) and the commands (`playVideo`, `pauseVideo`, …), `holdPlayer()` for the language switch, `hasHeard()` |
| `src/hooks/usePlayer.ts` | `usePlayer()`: a game screen's handle on the shared player (state + commands) |
| `src/lib/stacks.ts` | Same-year songs as one stack on the line, and converting the strip's gaps to card slots (`SwipeStack`, `useStackedLine`) |
| `src/hooks/useGameScreen.ts` | What both game screens start from: today's save, the player, the record and line state, and the `game_open` event |
| `src/hooks/useSwipeTrack.ts` | Keeps the scrolling strip and the chosen gap in step (`PITCH`) |
| `src/hooks/useSwipeKeys.ts` | Arrow keys, Home and End move the record from anywhere on the page |
| `src/hooks/useKeyShortcut.ts` | A page-wide key (Space plays in `Deck`, Enter places in `PlaceButton`) |
| `src/hooks/useSwipePitch.ts` | `PITCH` (the phone's gap-to-gap distance) and the strip's measured pitch, kept in a ref and re-measured on resize |
| `src/hooks/useSwipeDrag.ts`, `useSwipeWheel.ts` | Mouse controls for the strip: drag, click to a gap, wheel |
| `src/hooks/recordFlight.ts` | The record's flight from the home page into a game |
| `src/lib/share.ts` | `shareOrCopy()` plus the pure share-text builders (`sortShareText`, `marathonShareText`, `timelineShareText`) |
| `src/lib/motion.ts` | `canAnimate()` (Web Animations + reduced-motion check) and `holdHidden()` |
| `src/lib/smoothScroll.ts` | `smoothScrollToCenter()`: brings the record into view after a guess (instant scroll + compositor glide, so it never lags) |
| `src/components/Footer.tsx` | The home page's site footer (the YouTube disclaimer and the GitHub link): full width under a hairline, pushed to the bottom of the screen (`mt-auto` in the body's flex column) |
| `src/components/Deck.tsx` | Turntable UI, built from `DeckRecord` (the record, play/pause, loading ring), `DeckTransport` and `DeckStatus`. It only sends commands to the shared player |
| `src/components/SortGame.tsx` | Daily Five screen |
| `src/components/TimelineGame.tsx` | Daily Timeline screen (hidden page) |
| `src/components/MarathonGame.tsx` | Marathon screen (with `MarathonHeader`, `Hearts`, `MarathonFeedback`, `MarathonResult`) |
| `src/app/[lang]/page.tsx` | Home page: each mode is a record sleeve (`ModeSleeve`, `.sleeve-*` in `styles/home.css`) whose record flies into the game (`ModeLink` launches the clicked sleeve's `[data-flight-record]`), then `WeekStrip` and "How to play" |
| `src/components/SwipeLine.tsx` | With `SwipeCard`, `SwipeGap`, `SwipeOverview` and `useSwipeTrack`, the line both games use: a sideways strip of cards on a time rail. While placing, `Deck` puts its record in the middle (`around` prop) and the player swipes the strip under it; the two cards beside the record light up and the rail between their years glows. Earlier / Later buttons, arrow keys and an overview bar move it too. `reveal` holds the answer beside the record while it glows; when not placing the record sits above the strip, centered on `focus`. With `browse` (a finished Marathon), `SwipeBrowse` adds Earlier / Later buttons that scroll the strip a card at a time (`DONE_PITCH`), so players can look through the run and open songs on YouTube. Styles are the `.swipe-*` classes in `styles/swipe.css`, sized by the `--swipe-*` tokens. **Swiping must stay cheap** (it lagged before): the glow lives inside each gap so the browser scrolls it; the gap under the record comes from `scrollLeft / pitch` (no layout reads: `useSwipePitch` measures `--swipe-gap-width` + `--swipe-card-width` only on mount and resize, and `PITCH` must match the phone sizes); a move from outside the strip (a key, a button, a click, the end of a drag, a resize) centres the gap by measuring it (`centreGap`), since `slot × pitch` is half a gap-minus-card off and snapping doesn't always correct it; crossing a gap only moves CSS classes (`light()`) and sets the live gap (`src/lib/liveSlot.ts`), which the place button and the overview bar read with `useSyncExternalStore`, so they keep up with the finger while the rest of the game re-renders only 100 ms after the strip stops. `SwipeLine.perf.test.tsx` fails if this regresses. Don't render React per scroll frame, and only transition `opacity`/`transform` there (no colour, shadow or font-weight transitions). |
| `src/components/PlaceButton.tsx` | Says where the song goes ("Between 1992 and 1997", from `t.placeAt`); its accessible name adds "Place it: " |
| `src/components/Announce.tsx` | Screen-reader live region |
| `src/components/ExternalLink.tsx` | `target="_blank"` link that tells screen readers it opens a new tab |
| `src/test/` | Test setup and fakes: `fakeYouTube`, `fakeAnalytics`, `fakeClipboard`, `setupGameTests`, `renderIn(lang, ui)`, `expectAccessible`, `recordControls` (moving and reading the record), `realMouse` (Playwright's real mouse, for drags and wheels) |
| `lint/spindle-rules.mjs` | House lint rules oxlint has no built-in rule for |
| `src/i18n/` | Locale config, `messages.tsx` (all UI text), `I18nProvider`/`useI18n`, `getI18n` |
| `src/proxy.ts` | Redirects unprefixed URLs to the player's language |
| `src/components/Settings.tsx` | Settings page (song-language switches) |
| `src/components/LanguageSwitch.tsx` | English / עברית toggle in the header |
| `src/app/[lang]/opengraph-image.tsx` | Link preview image (the record + "Spindle"), drawn with `next/og` as SVG and prerendered per language |
| `src/app/styles/tokens.css` | The design tokens: palette, colour roles (light/dark), spacing, type, radii, shadows, motion, component sizes |
| `src/app/globals.css` | Imports Tailwind and the tokens, plus shared classes (`.card`, `.btn-primary`, `.game-*`); `styles/home.css`, `record.css` (`.record`, `.loading-ring`, the swap animation) and `swipe.css` (`.swipe-*`) hold the rest |
| `src/lib/palette.ts` | The few raw colours TypeScript needs (link preview image, favicon, theme colour); mirrors `tokens.css` |
| `scripts/validate-songs.mts` | oEmbed check for missing or non-embeddable videos |

## Save format (`spindle:v1`)

- `sort.days[day]` = `{ anchorYear, songIds, placements: {slot, correct}[] }`. The day is
  done when `placements.length === songIds.length` (`sortDayDone`). `sortLine(sortDay)` rebuilds the visible
  line: the anchor plus placed songs, with wrong ones moved to their correct position.
- `marathon.days[day]` = `{ anchorYear, languages, placements: {songId, slot, correct}[], skipped }`.
  The next song is the first of `marathonSongsFor(day, languages)` not yet placed or skipped;
  the day is over after `MARATHON_HEARTS` wrong placements. `marathon.stats` =
  `{ played, best, totalHits }`, updated once when a day ends.
- `timeline.cards` is a `TimelineCard[]` **that includes the starting-year card**
  (`anchor: true`). Always use `songCount(cards)` for scores, never `cards.length`.
  `timeline.today` = `{ date, songId, skipped, result: "pending" | "correct" | "wrong" }`.
- **Be backward compatible.** Players already have saves. `loadSave()` merges with
  defaults (a save from before Marathon gets an empty `marathon`), `ensureSortDay`
  replaces old-format days, and `ensureTimelineDay` adds a starting year to old mid-turn saves. Follow that pattern rather than bumping the version,
  which would wipe everyone's progress.

## YouTube player rules (product requirement)

- The player must **never show the title, channel, thumbnail, comments, or related
  videos** before the player has answered. There is **one global player**
  (`src/lib/player.ts`): its iframe lives in `.player-host`, appended to `<body>` outside
  React's tree, transparent and behind the page content (`z-index: -1`, `opacity: 0`),
  `inert` and `aria-hidden`, with `controls: 0`. Screens never touch it; they read its state
  and send commands through `usePlayer()`. Don't make the iframe visible, and don't show song
  info before the answer.
- **Why global:** switching language changes the root layout's `[lang]` segment, which
  remounts the whole page (only `<html>` and `<body>` survive). The language switch calls
  `holdPlayer()`, so the new page's screen takes over the same player and the song plays on,
  however often the player switches. Leaving the games (no screen takes the player) destroys
  it and stops the song.
- **Play before placing:** the place button stays locked ("Play the song to place it")
  until the current song has started playing (`hasHeard`, from the player's `startedId`), or
  its video failed.
- Spindle hosts no audio; songs only stream from YouTube.
- **Avoid layout shift.** The ring is always mounted and fades with opacity. The status
  line under the record has a fixed height (`h-5`). Keep it that way, since the user
  explicitly asked for no jumps.
- **Result animation:** after a guess, `Deck`'s `swap` prop makes the record glow green or red.
  In Daily Five it then swipes out in the reading direction (separate `-rtl` keyframes under
  `[dir="rtl"]`) and the next record slides in. Keep `var()` out of `@keyframes`: Safari
  can't run those off the main thread, so they lag on a throttled CPU. Play and "Place it" stay locked until
  `onSwapEnd`.
- If a video fails (`status === "error"`), Marathon offers "Give me a different song"
  (`skipMarathonSong`); it costs no heart.

## Gotchas

- **Next.js 16** with `cacheComponents` enabled. APIs differ from older versions, so read
  `node_modules/next/dist/docs/` before using unfamiliar APIs (see AGENTS.md).
- The **React Compiler lint rules** (oxlint's `react/refs`, `react/set-state-in-effect`,
  `react/purity`, …) are strict. Avoid `setState` inside effects and ref
  access during render. Prefer lazy `useState(() => ...)` initialisers in `ssr: false`
  components.
- **Tailwind v4.** `.card` and the other classes in the CSS files are unlayered, so they
  **beat Tailwind utilities**. To change a card's border or background, add a custom class
  (like `.card-good`, `.card-bad` or `.card-anchor`) instead of utility classes.
- **CSS minifier:** in the CSS files, an `animation` shorthand without a name is
  minified to `animation: none`. Use longhands (`animation-duration`, …) when the name is set
  by another class, and check the built CSS in `.next/static/chunks/*.css`. If a CSS edit
  doesn't show up there, Turbopack's cache is stale: `rm -rf .next` and build again.
- The site has a light and a dark theme (see "Styling"). Check new colours in both.
- **Song years** are the original release year of the song (single or album), not the
  video or a remaster.

## Code style

- No ESLint or Prettier: oxlint lints (type-aware rules come from `oxlint-tsgolint`, built
  on TypeScript 7) and oxfmt formats everything except `songs.json` (one song per line)
  and Markdown. Disable comments use `// oxlint-disable-next-line <rule>` plus a reason.
- **TypeScript 7** is the native (Go) compiler. It has no JavaScript API yet, so `next build`
  type-checks by running the local `tsc` CLI (Next's default `experimental.useTypeScriptCli`).
- TypeScript is strict with `noUncheckedIndexedAccess`: indexing an array or record gives
  `T | undefined`, so handle the missing case (`getSong` accepts `undefined` for this).
- Lint is strict and type-aware. Don't silence a rule without a comment saying why.
- House style (one component per file, specific file names, no barrels, `a ? <B /> : null`, no
  `typeof` in types, …) is in `.claude/rules/code-style.md`; lint enforces most of it.
- **Accessibility is checked in two layers; keep both green:**
  1. **Lint:** every `jsx-a11y` rule is an error in `.oxlintrc.json` (listed explicitly, since
     oxlint only turns on some of them by category). Only `prefer-tag-over-role` is off, with its reason.
  2. **Component tests:** `expectAccessible(container)` runs axe (WCAG A/AA + best practices,
     colour contrast included) on each game state and the settings page, in Chromium at phone
     width (390px) with the real site CSS (`globals.css` through `@tailwindcss/vite`). It also
     fails if the page scrolls sideways. The home page is a server component and isn't covered.
     axe can't measure contrast over the gradient at the top of the page (it reports
     "needs review" there, which doesn't fail), and it skips `aria-hidden` text. Check those by hand:
     small text needs **4.5:1** in both themes (`--color-muted` and the rail's `--color-faint`), and
     icons and borders need 3:1.
- Every control needs an accessible name; decorative emoji/SVGs get `aria-hidden`; results are
  announced through `Announce`; the YouTube host (`.player-host`) is `inert`. Anything that moves respects
  `prefers-reduced-motion` (CSS media query, or `canAnimate()` in JavaScript). Focus rings must
  stay visible: where a mask or `overflow` would clip one (the swipe line), draw it on a parent.

## Testing tips

- Project test rules live in `.claude/rules/testing.md` (import everything, never use `describe`, avoid mocks, parameterized tests use `it.for`); oxlint enforces them.

- Put logic tests in `src/lib/__tests__/` (vitest, node environment, `@/` alias set in
  `vitest.config.mts`).
- `src/lib/__tests__/golden.test.ts` snapshots a month of daily picks. If it fails, the
  daily puzzles changed for everyone: fix the code, don't update the snapshot (unless
  you added songs on purpose, then run `pnpm vitest -u`).
- Component tests live in `src/components/__tests__/` and run in **Vitest Browser Mode**
  (headless Chromium through `@vitest/browser-playwright`; the `browser` project in
  `vitest.config.mts`). The site CSS is loaded (`globals.css` via `@tailwindcss/vite`) and the viewport is 390px wide, in both colour schemes. Click with `await userEvent.click(el)`
  from `vitest/browser` (real pointer events), so helpers that click are `async`. Locally,
  a fresh machine needs `pnpm exec playwright install chromium` once. `setupGameTests()` installs a fake YouTube API under the real
  shared player (see `fakeYouTube`; it reports playing and paused like YouTube, so tests press play with `playSong()` before placing), render with `renderIn("en", <SortGame />)`, and call `expectAccessible(container)` (axe).
  Fire `animationEnd` on `.deck-swap` to finish the record animation.
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

# Spindle 🎶

A daily music game: **guess-the-year meets daily puzzle**. Listen to songs with no
title, thumbnail, or comments visible, and work out when they were released.

## Game modes

### 🎚️ Daily Five
Five songs, same for everyone each day, played **one at a time**. The line starts with a
single year card (e.g. *1980*). Place the first song *before* or *after* it, then the next
song into one of the gaps, and so on. Each right placement scores a 🟩; a wrong one is shown
in red and moved to its real spot so the line stays accurate. Perfect days build a streak.

### 📈 Daily Timeline
One song per day, and a timeline that grows the longer you keep playing:

- A new timeline starts with a free **starting year**, e.g. *1997*.
- **Day 1** – is today's song *before 1997* or *after 1997*? Get it right and it joins
  the timeline (say *2000*).
- **Day 2** – *before 1997*, *1997–2000*, or *after 2000*… and so on. More songs = more,
  narrower gaps = harder.
- A **wrong guess** or a **missed day** ends the timeline; a fresh one starts the next day.
  Your best length (in songs) is kept.
- Songs with the same year as a neighbour count as correct on either side.

Progress is stored in the browser (`localStorage`) — no accounts, no backend. A new day
starts at the player's local midnight.

## How audio works

Spindle hosts no audio. Each song is a YouTube video played through the
[YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
(`youtube-nocookie.com`, no controls, no related videos). The iframe sits **underneath an
opaque vinyl record**, so the player never sees the title, channel, thumbnail, or
comments — playback is driven entirely by Spindle's own play/pause/restart buttons. After
answering, each song gets a "watch" link to YouTube.

## Development

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm test             # unit + component tests (vitest, Testing Library, axe)
pnpm lint             # oxlint (React, type-aware TypeScript, accessibility, Next.js rules)
pnpm format           # oxfmt
pnpm typecheck
pnpm check            # everything CI runs except the build
pnpm build
pnpm validate-songs   # check every video still exists and allows embedding
```

Built with Next.js (App Router), React, TypeScript 7 and Tailwind CSS. Linted with oxlint and
formatted with oxfmt.

### Project layout

| Path | What |
| --- | --- |
| `src/data/songs.json` | The song catalog |
| `src/lib/daily.ts` | Deterministic daily song selection (seeded by date) |
| `src/lib/storage.ts` | Save format and all game state transitions |
| `src/lib/timeline.ts` | Slot / placement rules |
| `src/lib/youtube.ts` | Hidden YouTube player hook |
| `src/components/` | `Deck` (turntable), `SortGame` (Daily Five), `TimelineGame`, `TimelineParts` |

## Adding songs

Add an entry to `src/data/songs.json`:

```json
{ "artist": "a-ha", "title": "Take On Me", "year": 1985, "youtubeId": "djV11Xbc914" }
```

- `youtubeId` is the `v=` part of the YouTube URL. Prefer the artist's official upload.
- `year` is the original release year of the song (not the video or a remaster).
- Optional `"start": 12` skips a long intro (seconds).
- For Hebrew songs, add `"titleHe"` and `"artistHe"` (Hebrew script). Hebrew pages show
  those; English pages show the transliterated `title` and `artist`.
- Run `pnpm validate-songs` — videos with embedding disabled won't play.

Daily picks are derived from the catalog, so **changing the catalog changes future (and
past) puzzles**. Adding songs is fine; avoid editing on a day people are mid-puzzle.

## Deploying to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import this GitHub repository.
2. Keep the defaults (framework: Next.js, build: `next build`). No environment variables
   are needed.
3. Deploy. Every push to `main` redeploys automatically; pull requests get preview URLs.

## License

[MIT](./LICENSE). Songs and videos belong to their respective rights holders and are
streamed from YouTube.

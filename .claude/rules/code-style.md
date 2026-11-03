# Code style rules

Lint enforces everything here unless it says otherwise. `spindle/*` rules are in
`lint/spindle-rules.mjs`.

## Statements and JSX

```tsx
// NEVER
if (done) return null;
{ready && <Deck />}

// ALWAYS
if (done) {
  return null;
}
{ready ? <Deck /> : null}
```

- Always use braces (`curly`).
- Render conditionally with a ternary and `null` (`spindle/no-jsx-and`). `&&` is fine for values,
  such as `clsx("card", lit && "card-lit")` or `disabled={a && b}`.
- No nested ternaries. Use `if`, a lookup object or a small named function.
- Build conditional class names with `clsx`, not template strings (not linted).

## Types

- No `typeof` in types (`spindle/no-typeof-type`). Name and export the type, then use it.
- `typeof` at runtime is fine, for example for feature checks or validating data from storage.

## Files

- One component per file (`react/no-multi-comp`). Keep component files short: move logic to pure
  functions in `src/lib` and effects to hooks in `src/hooks`.
- Name a file after what it holds. No `helpers`, `utils`, `common`, `shared`, `misc` or `index`
  (`spindle/specific-file-name`).
- No barrel files or re-exports: import from the file that defines the thing (`spindle/no-barrel`).
- Named exports only, except what Next requires under `src/app` and tool configs
  (`import/no-default-export`).
- No `../` imports: use `@/`. `./` is fine within a folder (`import/no-relative-parent-imports`).
- Unused files, exports and dependencies fail `pnpm knip`.

## Folders

**At most 7 files per folder** (`spindle/max-files-per-folder`, on everything under `src/` and
`scripts/`). Subfolders don't count, so when a folder fills up, group its files into subfolders by
feature, not by kind:

```text
// NEVER
src/components/SortGame.tsx, SortHeader.tsx, MarathonGame.tsx, Hearts.tsx, SwipeLine.tsx, …

// ALWAYS
src/components/sort/SortGame.tsx, sort/SortHeader.tsx
src/components/marathon/MarathonGame.tsx, marathon/Hearts.tsx
src/components/swipe/SwipeLine.tsx, swipe/card/SwipeCard.tsx
```

- A screen and the components only it uses share one folder (`sort/`, `marathon/`, `timeline/`,
  `settings/`); pieces several screens use get their own (`deck/`, `swipe/`, `game/`, `result/`).
- Tests sit in a `__tests__/` folder inside the folder they test (`sort/__tests__/SortGame.test.tsx`),
  which counts on its own too.
- The same goes for `src/lib`, `src/hooks` and `src/test`: `lib/games/`, `hooks/swipe/`,
  `test/fakes/`, …
- Don't dodge the limit with vague folders (`misc/`, `other/`, `common/`): name a folder after the
  feature it holds.

## Layers

`app` → `components` → `hooks` → `lib` and `i18n`. `lib` and `i18n` never import `app`, `components`
or `hooks`; `hooks` never import `app` or `components` (`no-restricted-imports`).

## Size

Limits are errors: `complexity` 15, `max-depth` 3, `max-params` 4, 300 lines per file, 120 per
function. Split the code rather than raising a limit.

## Languages

`src/i18n/config.ts` is the only place that lists the supported languages. Everywhere else loops
over `LOCALES` or uses the `Locale` type (not linted).

## Styling

Every style comes from the design tokens in `src/app/styles/tokens.css` (see "Styling" in
CLAUDE.md). stylelint (`spindle/tokens-only`, `spindle/spacing-grid`) and oxlint
(`spindle/no-raw-style`) enforce it.

```tsx
// NEVER
<p className="mt-3 text-[13px] text-white" />
.card { padding: 0.75rem; color: #a1a1aa; }

// ALWAYS
<p className="mt-150 text-sm text-ink" />
.card { padding: var(--spacing-150); color: var(--color-muted); }
```

- Spacing is named in hundreds: 100 = 0.5rem, on a 4px grid. Sizes are built from spacing tokens.
- Colours by role (`primary`, `secondary`, `muted`, `success`, `marathon`, …), never by hue.
- A value that has no token yet gets one in `tokens.css`, built from the scales there.

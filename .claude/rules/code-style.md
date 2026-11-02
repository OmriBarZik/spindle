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

## Layers

`app` → `components` → `hooks` → `lib` and `i18n`. `lib` and `i18n` never import `app`, `components`
or `hooks`; `hooks` never import `app` or `components` (`no-restricted-imports`).

## Size

Limits are errors: `complexity` 15, `max-depth` 3, `max-params` 4, 300 lines per file, 120 per
function. Split the code rather than raising a limit.

## Languages

`src/i18n/config.ts` is the only place that lists the supported languages. Everywhere else loops
over `LOCALES` or uses the `Locale` type (not linted).

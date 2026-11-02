# Testing rules

## Import everything, and never use `describe`

- Don't use globals: import `it`, `expect`, `vi` and the hooks from `vitest`, and anything else a
  test uses, as far as possible (`vitest/prefer-importing-vitest-globals`).
- **Never use `describe`** (`spindle/no-describe`). Tests are flat, with hooks at the top of the
  file. When one file covers several topics, start the title with the topic:
  `it("loadSave: starts fresh without a save", ...)`.

## Avoid mocks

Run the real code, and fake only the outside world, as small recording fakes in `src/test/`
(`fakeYouTube`, `fakeAnalytics`, `fakeClipboard`). Assert on what the player would see or on what
the fake recorded.

- No `vi.mock`, `vi.fn` or `vi.spyOn`: oxlint's `vitest/no-restricted-vi-methods` rejects them.
- The one exception is `@/i18n/server` in `Pages.test.tsx`, since `next/root-params` only exists
  inside a Next build. A new exception needs a disable comment saying why it can't be avoided.

## Parameterized tests use `test.for` / `it.for`, never a loop around `it`

```ts
// NEVER
for (const item of items) {
  it(`does something with ${item.name}`, () => {
    /* test */
  });
}

// ALWAYS
it.for(items)("does something with $name", (item) => {
  /* test */
});
```

- Use `it.for`. Vitest passes each case as one argument (arrays are
  not spread, unlike `.each`), and the test context is still available as the second argument.
- Give cases a `name` field and put `$name` in the title. Snapshot keys come from the title, so
  keep a title stable when moving an existing test (see `golden.test.ts`).
- Loops that only call `expect` inside one test are fine; the rule is about generating tests.
- Enforced by oxlint: `vitest/prefer-each` and `vitest/consistent-each-for` (set to `for`) in
  `.oxlintrc.json`. Docs: https://vitest.dev/api/test.html#test-for

## Test projects

`pnpm test` runs four Vitest projects (`vitest.config.mts`):

- `unit`: logic, in Node (`src/lib/**/*.test.ts`).
- `lint-rules`: runs oxlint on samples to prove the rules in `lint/spindle-rules.mjs` still work.
- `browser`: components, in Chromium (`src/components/**/*.test.tsx`).
- `performance`: swiping on a slowed-down CPU (`*.perf.test.tsx`). It runs last and alone.

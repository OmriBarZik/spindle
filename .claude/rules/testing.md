# Testing rules

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

- Use `describe.for` / `it.for` / `test.for`. Vitest passes each case as one argument (arrays are
  not spread, unlike `.each`), and the test context is still available as the second argument.
- Give cases a `name` field and put `$name` in the title. Snapshot keys come from the title, so
  keep a title stable when moving an existing test (see `golden.test.ts`).
- Loops that only call `expect` inside one test are fine; the rule is about generating tests.
- Enforced by oxlint: `vitest/prefer-each` and `vitest/consistent-each-for` (set to `for`) in
  `.oxlintrc.json`. Docs: https://vitest.dev/api/test.html#test-for

import stylelint from "stylelint";
import { expect, it } from "vitest";

/** Runs stylelint with the repo's config on `code`, and returns the rules that fired. */
async function lintCss(code: string): Promise<string[]> {
  const { results } = await stylelint.lint({ code, configFile: ".stylelintrc.json" });
  return (results[0]?.warnings ?? []).map((w) => w.rule);
}

it.for([
  { name: "a rem length", code: ".a {\n  margin: 9.75rem;\n}\n" },
  { name: "a px length", code: ".a {\n  width: 10px;\n}\n" },
  { name: "a hex colour", code: ".a {\n  color: #fff;\n}\n" },
  { name: "an rgb() colour", code: ".a {\n  color: rgb(0 0 0 / 50%);\n}\n" },
  { name: "a raw duration", code: ".a {\n  transition: opacity 0.2s;\n}\n" },
  { name: "a raw size in a component token", code: ":root {\n  --swipe-x: 2rem;\n}\n" },
  { name: "a colour in a role", code: ":root {\n  --color-x: #fff;\n}\n" },
])("tokens-only flags $name", async ({ code }) => {
  expect(await lintCss(code)).toEqual(["spindle/tokens-only"]);
});

it.for([
  { name: "off the 4px grid", code: ":root {\n  --spacing-30: 0.15rem;\n}\n" },
  { name: "a name that lies", code: ":root {\n  --spacing-100: 1rem;\n}\n" },
])("spacing-grid flags a spacing token $name", async ({ code }) => {
  expect(await lintCss(code)).toEqual(["spindle/spacing-grid"]);
});

it("allows styles built from the tokens", async () => {
  const code = `:root {
  --spacing-100: 0.5rem;
  --palette-x: #fff;
  --color-x: var(--palette-x);
  --border-thin: 1px;
  --duration-x: 0.2s;
  --swipe-x: calc(var(--spacing-100) * 2);
}

.a {
  margin: var(--spacing-100) 50%;
  color: var(--color-x);
  transition: opacity var(--duration-x) ease;
  transform: rotate(90deg) scale(1.5);
}
`;
  expect(await lintCss(code)).toEqual([]);
});

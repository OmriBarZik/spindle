import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, expect, it } from "vitest";

const OXLINT = resolve("node_modules/.bin/oxlint");
const RULES = [
  "max-files-per-folder",
  "no-barrel",
  "no-describe",
  "no-jsx-and",
  "no-raw-style",
  "no-typeof-type",
  "specific-file-name",
];
const dir = mkdtempSync(join(tmpdir(), "spindle-rules-"));

afterAll(() => rmSync(dir, { recursive: true }));

/** Runs the real oxlint with only the house rules on, and returns the ones that fired. */
function lint(file: string, code: string, folder = dir): string[] {
  const config = join(dir, "oxlintrc.json");
  writeFileSync(
    config,
    JSON.stringify({
      jsPlugins: [resolve("lint/spindle-rules.mjs")],
      categories: { correctness: "off" },
      rules: Object.fromEntries(RULES.map((rule) => [`spindle/${rule}`, "error"])),
    }),
  );
  const path = join(folder, file);
  writeFileSync(path, code);
  const { stdout } = spawnSync(OXLINT, ["-c", config, "--format=json", path], { encoding: "utf8" });
  const { diagnostics } = JSON.parse(stdout) as { diagnostics: { code: string }[] };
  rmSync(path);
  return diagnostics.map((d) => d.code);
}

it.for([
  { name: "a JSX `&&`", rule: "no-jsx-and", code: "export const A = (a) => <p>{a && <b />}</p>;" },
  {
    name: "a value `&&` child",
    rule: "no-jsx-and",
    code: "export const A = (a, b) => <p>{a && b}</p>;",
  },
  { name: "`&&` outside JSX", rule: "no-jsx-and", code: "export const A = (a) => a && <b />;" },
  {
    name: "`typeof` in a type",
    rule: "no-typeof-type",
    code: "const a = 1;\nexport type A = typeof a;",
  },
  { name: "`export *`", rule: "no-barrel", code: 'export * from "./a";' },
  { name: "a re-export", rule: "no-barrel", code: 'export { a } from "./a";' },
  { name: "`describe`", rule: "no-describe", code: 'describe("a", () => {});' },
  { name: "`describe.for`", rule: "no-describe", code: 'describe.for([])("a", () => {});' },
  { name: "a hex colour", rule: "no-raw-style", code: 'export const a = "#8b5cf6";' },
  { name: "an rgb() colour", rule: "no-raw-style", code: 'export const a = "rgb(0 0 0)";' },
  {
    name: "a Tailwind colour",
    rule: "no-raw-style",
    code: 'export const A = () => <p className="text-white" />;',
  },
  {
    name: "an arbitrary value",
    rule: "no-raw-style",
    code: 'export const A = () => <p className="text-[13px]" />;',
  },
  {
    name: "an arbitrary property",
    rule: "no-raw-style",
    code: 'export const A = () => <p className="[animation-play-state:paused]" />;',
  },
  {
    name: "Tailwind's own spacing",
    rule: "no-raw-style",
    code: 'export const A = () => <p className="flex gap-3" />;',
  },
  {
    name: "off-scale spacing in a variant",
    rule: "no-raw-style",
    code: 'export const A = () => <p className="sm:-mt-75" />;',
  },
])("flags $name", ({ rule, code }) => {
  expect(lint("sample.tsx", code)).toEqual([`spindle(${rule})`]);
});

it.for([{ name: "helpers" }, { name: "utils" }, { name: "index" }, { name: "common" }])(
  "flags a file named $name",
  ({ name }) => {
    expect(lint(`${name}.ts`, "export const a = 1;")).toEqual(["spindle(specific-file-name)"]);
  },
);

it("allows the code the rules ask for", () => {
  const code = `
    const a = true;
    export const A = () => <p className={a && "b"}>{a ? <b /> : null}</p>;
    export const B = () => <p className="gap-150 p-100 -inset-150 w-(--size-record) bg-surface top-1/2" />;
    export const sel = "[data-gap]";
    export const isText = (v) => typeof v === "string";
    export const b = 1;
  `;
  expect(lint("specificName.tsx", code)).toEqual([]);
});

it.for([
  { name: "7 files", files: 7, fired: [] },
  { name: "8 files", files: 8, fired: ["spindle(max-files-per-folder)"] },
])("max-files-per-folder: a folder with $name", ({ files, fired }) => {
  const folder = mkdtempSync(join(dir, "folder-"));
  mkdirSync(join(folder, "nested"));
  for (let i = 1; i < files; i++) {
    writeFileSync(join(folder, `other${i}.ts`), "export const a = 1;");
  }
  expect(lint("sample.ts", "export const a = 1;", folder)).toEqual(fired);
});

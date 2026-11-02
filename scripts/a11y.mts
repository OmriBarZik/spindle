#!/usr/bin/env node
import type { AxeResults } from "axe-core";
/**
 * Accessibility check of the built site in a real browser, with the real CSS
 * (so colour contrast counts, unlike the component tests).
 *
 * Starts `next start`, then for every page in both languages, at phone width:
 * - runs axe (WCAG 2.0 / 2.1 / 2.2 A and AA, plus best practices),
 * - fails if the page scrolls sideways (WCAG 1.4.10, reflow).
 * The games are also played through, so the answer and end-of-day screens are checked.
 *
 * Usage: pnpm build && pnpm a11y
 *
 * Runs as TypeScript directly (Node strips the types).
 */
// Pages are checked one after another, each step waiting for the one before.
/* oxlint-disable no-await-in-loop */
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { chromium, type Page } from "playwright";

const require = createRequire(import.meta.url);
const PORT = 3199;
const ORIGIN = `http://localhost:${PORT}`;
const LANGS = ["en", "he"] as const;
const PAGES = ["", "/sort", "/timeline", "/settings"];

// YouTube and Google Analytics may be blocked here: stand in for the player API.
const FAKE_YOUTUBE = `
  window.YT = { Player: function (el, o) {
    setTimeout(function () { o.events && o.events.onReady && o.events.onReady(); }, 10);
    return { loadVideoById() {}, playVideo() {}, pauseVideo() {}, stopVideo() {}, seekTo() {},
      getCurrentTime() { return 0; }, destroy() {} };
  } };
  setTimeout(function () { window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady(); }, 0);
`;

const axeSource = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
const problems: string[] = [];

async function check(page: Page, name: string) {
  await page.addScriptTag({ content: axeSource });
  const results = await page.evaluate(() =>
    (
      window as unknown as { axe: { run: (c: Document, o: object) => Promise<AxeResults> } }
    ).axe.run(document, {
      runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
    }),
  );
  for (const v of results.violations) {
    const where = v.nodes.map((n) => `      ${n.target.join(" ")}`).join("\n");
    problems.push(`${name}: ${v.id} (${v.impact ?? "?"}) ${v.help}\n${where}`);
  }
  const sideways = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (sideways > 0) problems.push(`${name}: the page scrolls sideways by ${sideways}px`);
  console.log(`${results.violations.length || sideways > 0 ? "✗" : "✓"} ${name}`);
}

/** Press the place button `times` times, waiting out the record's result animation. */
async function place(page: Page, times: number) {
  for (let i = 0; i < times; i++) {
    await page.locator(".btn-primary:not(:disabled)").first().click();
    await page.waitForSelector(".deck-swap", { state: "detached", timeout: 10_000 });
  }
}

const server = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "start", "-p", `${PORT}`],
  {
    stdio: "ignore",
  },
);
try {
  // Wait for the server.
  for (let tries = 0; ; tries++) {
    try {
      if ((await fetch(`${ORIGIN}/en`)).ok) break;
    } catch {
      // Not up yet.
    }
    if (tries > 100) throw new Error("next start didn't come up; run `pnpm build` first");
    await new Promise((r) => setTimeout(r, 300));
  }

  const browser = await chromium.launch();
  for (const lang of LANGS) {
    for (const path of PAGES) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.route("https://www.youtube.com/iframe_api", (r) =>
        r.fulfill({ contentType: "text/javascript", body: FAKE_YOUTUBE }),
      );
      await page.route("**/*googletagmanager*/**", (r) => r.abort());
      await page.goto(`${ORIGIN}/${lang}${path}`);
      await page.waitForLoadState("networkidle");
      await check(page, `/${lang}${path}`);

      if (path === "/sort") {
        await place(page, 1);
        await check(page, `/${lang}${path} after a guess`);
        await place(page, 4);
        await check(page, `/${lang}${path} finished`);
      } else if (path === "/timeline") {
        await place(page, 1);
        await check(page, `/${lang}${path} answered`);
      }
      await context.close();
    }
  }
  await browser.close();
} finally {
  server.kill();
}

if (problems.length > 0) {
  console.error(`\n${problems.length} accessibility problem(s):\n\n${problems.join("\n\n")}`);
  process.exitCode = 1;
} else {
  console.log("\nNo accessibility problems found.");
}

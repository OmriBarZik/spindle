import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";
import { fileURLToPath } from "node:url";
import type { CDPSession } from "playwright";
import { defineConfig } from "vitest/config";
import type { BrowserCommand } from "vitest/node";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

// Components run in a real (headless) Chromium via Playwright.
const browserProject = {
  resolve: { alias },
  // next/link reads a few of Next's build flags; a browser has no `process`.
  define: { "process.env": {} },
  plugins: [tailwindcss()],
};

type ColorScheme = "light" | "dark";

/** One Chromium at phone width per colour scheme: axe checks contrast in each theme. */
const chromium = (name: string, schemes: readonly ColorScheme[]) => ({
  enabled: true,
  headless: true,
  provider: playwright(),
  instances: schemes.map((colorScheme) => ({
    browser: "chromium" as const,
    name: `${name}-${colorScheme}`,
    viewport: { width: 390, height: 844 },
    provider: playwright({ contextOptions: { colorScheme } }),
  })),
  screenshotFailures: false,
});

// Chromium drops the throttling when its session closes, so the session stays open.
let cpuSession: CDPSession | null = null;

/** Runs on the test server: slows the page's CPU `rate` times (1 = normal speed). */
const setCpuThrottling: BrowserCommand<[rate: number]> = async ({ page }, rate) => {
  cpuSession ??= await page.context().newCDPSession(page);
  await cpuSession.send("Emulation.setCPUThrottlingRate", { rate });
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        // Pure logic: fast, in Node.
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["src/lib/**/*.test.ts"],
          sequence: { groupOrder: 0 },
        },
      },
      {
        // Runs oxlint itself, so an upgrade that breaks the house lint rules fails here.
        test: {
          name: "lint-rules",
          environment: "node",
          include: ["lint/**/*.test.mts"],
          sequence: { groupOrder: 0 },
        },
      },
      {
        ...browserProject,
        test: {
          name: "browser",
          include: ["src/components/**/*.test.tsx"],
          exclude: ["**/*.perf.test.tsx"],
          sequence: { groupOrder: 0 },
          browser: chromium("browser", ["dark", "light"]),
        },
      },
      {
        // Swiping on a slowed-down CPU. Runs last and alone, so other tests can't skew the timing.
        ...browserProject,
        test: {
          name: "performance",
          include: ["src/components/**/*.perf.test.tsx"],
          sequence: { groupOrder: 1 },
          // Timing on a busy machine can be off once; a real slowdown fails every time.
          retry: 2,
          browser: { ...chromium("performance", ["dark"]), commands: { setCpuThrottling } },
        },
      },
    ],
  },
});

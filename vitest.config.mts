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

/** A point in the test page's own coordinates (clientX / clientY). */
type Point = readonly [x: number, y: number];

/** Where the test page's iframe sits on the screen, and how much it's scaled. */
async function framePoint(context: Parameters<BrowserCommand>[0], [x, y]: Point) {
  const frame = await context.frame();
  const box = await (await frame.frameElement()).boundingBox();
  const width = await frame.evaluate(() => window.innerWidth);
  if (!box) {
    throw new Error("The test page isn't on screen");
  }
  const scale = box.width / width;
  return { x: box.x + x * scale, y: box.y + y * scale };
}

/** Runs on the test server: drags with the real mouse, in `steps` moves. */
const mouseDrag: BrowserCommand<[from: Point, to: Point, steps?: number]> = async (
  context,
  from,
  to,
  steps = 10,
) => {
  const { mouse } = context.page;
  const start = await framePoint(context, from);
  const end = await framePoint(context, to);
  await mouse.move(start.x, start.y);
  await mouse.down();
  await mouse.move(end.x, end.y, { steps });
  await mouse.up();
};

/** Runs on the test server: turns the real mouse wheel over a point. */
const mouseWheel: BrowserCommand<[at: Point, deltaY: number]> = async (context, at, deltaY) => {
  const { x, y } = await framePoint(context, at);
  await context.page.mouse.move(x, y);
  await context.page.mouse.wheel(0, deltaY);
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
          browser: {
            ...chromium("browser", ["dark", "light"]),
            commands: { mouseDrag, mouseWheel },
          },
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

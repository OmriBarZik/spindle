import { playwright } from "@vitest/browser-playwright";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        // Pure logic: fast, in Node.
        resolve: { alias },
        test: { name: "unit", environment: "node", include: ["src/lib/**/*.test.ts"] },
      },
      {
        // Components: rendered in a real (headless) Chromium via Playwright.
        resolve: { alias },
        test: {
          name: "browser",
          include: ["src/components/**/*.test.tsx"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
            screenshotFailures: false,
          },
        },
      },
    ],
  },
});

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    // Logic tests run in node; component tests opt in with `// @vitest-environment jsdom`.
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
  },
});

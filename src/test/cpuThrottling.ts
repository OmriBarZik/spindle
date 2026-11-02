import { commands } from "vitest/browser";

declare module "vitest/browser" {
  // Adding a command needs declaration merging, which only interfaces do.
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface BrowserCommands {
    setCpuThrottling: (rate: number) => Promise<void>;
  }
}

/** Slows the page's CPU `rate` times, like a cheap phone. 1 is normal speed. */
export function setCpuThrottling(rate: number): Promise<void> {
  return commands.setCpuThrottling(rate);
}

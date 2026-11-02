import { commands } from "vitest/browser";

type Point = readonly [x: number, y: number];

declare module "vitest/browser" {
  // Adding a command needs declaration merging, which only interfaces do.
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface BrowserCommands {
    mouseDrag: (from: Point, to: Point, steps?: number) => Promise<void>;
    mouseWheel: (at: Point, deltaY: number) => Promise<void>;
  }
}

/**
 * Drags with the real mouse (Playwright's, so the browser makes the pointer events and
 * pointer capture works), from one point of the page to another (clientX / clientY).
 */
export function mouseDrag(from: Point, to: Point, steps?: number): Promise<void> {
  return commands.mouseDrag(from, to, steps);
}

/** Turns the real mouse wheel (down is positive) over a point of the page. */
export function mouseWheel(at: Point, deltaY: number): Promise<void> {
  return commands.mouseWheel(at, deltaY);
}

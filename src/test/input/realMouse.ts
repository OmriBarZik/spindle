import { commands } from "vitest/browser";

type Point = readonly [x: number, y: number];

declare module "vitest/browser" {
  // Adding a command needs declaration merging, which only interfaces do.
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface BrowserCommands {
    mouseDrag: (from: Point, to: Point, steps?: number) => Promise<void>;
    mouseHold: (from: Point, to: Point) => Promise<void>;
    mouseUp: () => Promise<void>;
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

/**
 * Presses the real mouse at one point and moves it to another, still holding the button
 * until `mouseUp()`.
 */
export function mouseHold(from: Point, to: Point): Promise<void> {
  return commands.mouseHold(from, to);
}

/** Lets go of the mouse button `mouseHold` pressed. */
export function mouseUp(): Promise<void> {
  return commands.mouseUp();
}

/** Turns the real mouse wheel (down is positive) over a point of the page. */
export function mouseWheel(at: Point, deltaY: number): Promise<void> {
  return commands.mouseWheel(at, deltaY);
}

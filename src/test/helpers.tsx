import "@/app/globals.css";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import type { ReactElement } from "react";
import { afterEach, beforeEach, expect, vi } from "vitest";
import { userEvent } from "vitest/browser";
import type { Locale } from "@/i18n/config";
import { I18nProvider } from "@/i18n/I18nProvider";
import { MESSAGES } from "@/i18n/messages";
import type { SaveData } from "@/lib/storage";
import type * as Youtube from "@/lib/youtube";
import type { HiddenPlayer } from "@/lib/youtube";

/** A stand-in for the YouTube player. Tests change its fields to simulate states. */
export const fakePlayer: HiddenPlayer = {
  ready: true,
  currentId: null,
  status: "idle",
  time: 0,
  play: vi.fn<HiddenPlayer["play"]>(),
  pause: vi.fn<HiddenPlayer["pause"]>(),
  toggle: vi.fn<HiddenPlayer["toggle"]>(),
  restart: vi.fn<HiddenPlayer["restart"]>(),
  stop: vi.fn<HiddenPlayer["stop"]>(),
};

/** Stands in for the Google Analytics snippet's `window.gtag`. */
export const gtag = vi.fn<NonNullable<Window["gtag"]>>();

/** The analytics events sent so far, as `[name, params]`. */
export function trackedEvents(): [string, Record<string, unknown>][] {
  return gtag.mock.calls.map(([, name, params]) => [name, params]);
}

/** Mock factory for `@/lib/youtube` (call from `vi.mock`). */
export async function mockYoutube(importOriginal: () => Promise<typeof Youtube>) {
  const real = await importOriginal();
  return {
    ...real,
    useHiddenPlayer: () => ({ hostRef: { current: null }, player: fakePlayer }),
  };
}

/** Fix "today" and start every test with an empty save and an idle player. */
export function setupGameTests(now = "2026-11-01T10:00:00") {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(now));
    window.localStorage.clear();
    window.gtag = gtag;
    Object.assign(fakePlayer, { ready: true, currentId: null, status: "idle", time: 0 });
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    delete window.gtag;
  });
}

/** Replaces the clipboard with a mock and returns its `writeText`. */
export function mockClipboard() {
  const writeText = vi.fn<Clipboard["writeText"]>().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  return writeText;
}

export function renderIn(lang: Locale, ui: ReactElement) {
  return render(<I18nProvider lang={lang}>{ui}</I18nProvider>);
}

/** The save as the game wrote it. */
export function savedData(): SaveData {
  return JSON.parse(window.localStorage.getItem("spindle:v1") ?? "null") as SaveData;
}

/** Fails with a readable list if axe finds accessibility problems (with the real site CSS). */
export async function expectAccessible(container: HTMLElement) {
  const result = await axe.run(container, {
    runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
  });
  const problems = result.violations.map(
    (v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => n.html).join("\n  ")}`,
  );
  // The test viewport is phone width: the page must not scroll sideways (WCAG 1.4.10, reflow).
  const root = document.documentElement;
  if (root.scrollWidth > root.clientWidth) problems.push("the page scrolls sideways");
  expect(problems).toEqual([]);
}

/** The gap the record is on, read from the line's overview bar. */
export function recordGap(container: HTMLElement): number {
  return [...container.querySelectorAll(".swipe-map-gap")].findIndex((g) =>
    g.classList.contains("swipe-map-on"),
  );
}

/** Moves the record to gap `slot` with the Earlier / Later buttons. */
export async function moveRecordTo(container: HTMLElement, slot: number, lang: Locale = "en") {
  const { earlier, later } = MESSAGES[lang].common;
  for (let step = 0; recordGap(container) !== slot; step++) {
    if (step > 50) throw new Error(`The record never reached gap ${slot}`);
    const name = recordGap(container) < slot ? later : earlier;
    // Each step depends on the one before.
    // oxlint-disable-next-line no-await-in-loop
    await userEvent.click(screen.getByRole("button", { name }));
  }
}

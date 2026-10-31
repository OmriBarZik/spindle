import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";
import type { ReactElement } from "react";
import { afterEach, beforeEach, expect, vi } from "vitest";
import type { Locale } from "@/i18n/config";
import { I18nProvider } from "@/i18n/I18nProvider";
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
    Object.assign(fakePlayer, { ready: true, currentId: null, status: "idle", time: 0 });
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
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

/** Fails with a readable list if axe finds accessibility problems. */
export async function expectAccessible(container: HTMLElement) {
  const result = await axe.run(container, {
    // jsdom can't compute colours or layout.
    rules: { "color-contrast": { enabled: false } },
  });
  const problems = result.violations.map(
    (v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => n.html).join("\n  ")}`,
  );
  expect(problems).toEqual([]);
}

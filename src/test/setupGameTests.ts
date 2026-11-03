import "@/app/globals.css";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { installFakeAnalytics } from "@/test/fakes/fakeAnalytics";
import { installFakeYouTube } from "@/test/fakes/fakeYouTube";

/** Fix "today" and start every test with an empty save and a fresh YouTube and GA. */
export function setupGameTests(now = "2026-11-01T10:00:00") {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(now));
    window.localStorage.clear();
    installFakeAnalytics();
    installFakeYouTube();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    delete window.gtag;
    delete window.YT;
  });
}

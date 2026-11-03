import { afterEach, beforeEach, expect, it } from "vitest";
import {
  handedOffVideo,
  handOffPlayback,
  type Playback,
  registerPlayback,
  takeHandoff,
} from "@/lib/playHandoff";

let playback: Playback | null = null;
let unregister: (() => void) | null = null;

beforeEach(() => {
  unregister = registerPlayback(() => playback);
});

afterEach(() => {
  unregister?.();
  playback = null;
  // Clears any handoff left over.
  takeHandoff("");
});

it("carries on a playing song where it was, plus the time the switch took", () => {
  playback = { videoId: "abc", time: 30, playing: true };
  handOffPlayback(1000);
  expect(handedOffVideo(2000)).toBe("abc");
  expect(takeHandoff("abc", 3500)).toEqual({ time: 32.5, playing: true });
  // Only once.
  expect(takeHandoff("abc", 3500)).toBeNull();
});

it("keeps a paused song's place", () => {
  playback = { videoId: "abc", time: 30, playing: false };
  handOffPlayback(1000);
  expect(takeHandoff("abc", 5000)).toEqual({ time: 30, playing: false });
});

it("ignores another song, a stale handoff, and a player that started nothing", () => {
  playback = { videoId: "abc", time: 30, playing: true };
  handOffPlayback(1000);
  expect(takeHandoff("other", 1500)).toBeNull();
  handOffPlayback(1000);
  expect(handedOffVideo(60_000)).toBeNull();
  expect(takeHandoff("abc", 60_000)).toBeNull();
  playback = null;
  handOffPlayback(1000);
  expect(handedOffVideo(1500)).toBeNull();
});

it("forgets an unmounted player", () => {
  playback = { videoId: "abc", time: 30, playing: true };
  unregister?.();
  handOffPlayback(1000);
  expect(handedOffVideo(1500)).toBeNull();
});

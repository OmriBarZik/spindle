/**
 * Keeps a song going across a language switch. Switching language moves to the same
 * page under another prefix, which mounts the game (and its hidden player) afresh, so
 * the switch notes what the player was doing and the new page picks it up.
 */

/** What a player is doing, as the language switch finds it. */
export type Playback = { videoId: string; time: number; playing: boolean };

type Handoff = Playback & { at: number };

/** How long (ms) a handoff waits for the new page's player. */
const WINDOW = 15_000;

let current: (() => Playback | null) | null = null;
let handoff: Handoff | null = null;

/** The mounted player tells the switch how to read it; returns the way to forget it. */
export function registerPlayback(read: () => Playback | null): () => void {
  current = read;
  return () => {
    if (current === read) {
      current = null;
    }
  };
}

/** Called as the language switch is clicked: notes the song the player has started. */
export function handOffPlayback(now = Date.now()): void {
  const playback = current?.() ?? null;
  handoff = playback ? { ...playback, at: now } : null;
}

function fresh(now: number): Handoff | null {
  return handoff && now - handoff.at < WINDOW ? handoff : null;
}

/** The video the player had started before the switch, if it's still fresh. */
export function handedOffVideo(now = Date.now()): string | null {
  return fresh(now)?.videoId ?? null;
}

/**
 * Takes the handoff for `videoId` (once): where to carry on from, counting the time
 * since the switch while it played. Null if it was for another song or has gone stale.
 */
export function takeHandoff(
  videoId: string,
  now = Date.now(),
): { time: number; playing: boolean } | null {
  const h = fresh(now);
  handoff = null;
  if (!h || h.videoId !== videoId) {
    return null;
  }
  return { time: h.playing ? h.time + (now - h.at) / 1000 : h.time, playing: h.playing };
}

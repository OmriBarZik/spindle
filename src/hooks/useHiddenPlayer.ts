"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { handedOffVideo, type Playback, registerPlayback } from "@/lib/playHandoff";

/* Minimal typings for the parts of the YouTube IFrame API we use. */
type YTPlayer = {
  loadVideoById: (opts: { videoId: string; startSeconds?: number }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  destroy: () => void;
};

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      width: string | number;
      height: string | number;
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
        onError?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
};

declare global {
  // An interface, so it merges with the DOM's own Window type.
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** The player states we follow, by YouTube's numbers (-1 unstarted and 5 cued are left out). */
const STATES: Partial<Record<number, PlayerStatus>> = {
  0: "ended",
  1: "playing",
  2: "paused",
  3: "loading",
};

let apiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }
  apiPromise ??= new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) {
        resolve(window.YT);
      }
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });
  return apiPromise;
}

type PlayerEvents = NonNullable<ConstructorParameters<YTNamespace["Player"]>[1]["events"]>;

/** A player with no controls of its own, from the privacy-enhanced host. */
function createPlayer(YT: YTNamespace, mount: HTMLElement, events: PlayerEvents): YTPlayer {
  return new YT.Player(mount, {
    width: "100%",
    height: "100%",
    host: "https://www.youtube-nocookie.com",
    playerVars: {
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      rel: 0,
      playsinline: 1,
      modestbranding: 1,
    },
    events,
  });
}

type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

/** What the player is doing, for the language switch: only a song it has started. */
function playback(
  p: YTPlayer | null,
  videoId: string | null,
  startedId: string | null,
  status: PlayerStatus,
): Playback | null {
  if (!p || !videoId || startedId !== videoId) {
    return null;
  }
  return {
    videoId,
    time: p.getCurrentTime(),
    playing: status === "playing" || status === "loading",
  };
}

export type HiddenPlayer = {
  ready: boolean;
  currentId: string | null;
  /** The last video that actually started playing (the player has heard it). */
  startedId: string | null;
  status: PlayerStatus;
  time: number;
  play: (videoId: string, start?: number) => void;
  pause: () => void;
  toggle: (videoId: string, start?: number) => void;
  restart: (start?: number) => void;
  stop: () => void;
};

/**
 * A YouTube player whose iframe is mounted into `hostRef` and is expected to be
 * covered by an opaque overlay — the player never sees the title, channel,
 * thumbnail, or comments. All control goes through our own buttons.
 */
export function useHiddenPlayer() {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const currentRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [time, setTime] = useState(0);
  // A song heard before a language switch counts as heard on the new page too.
  const [startedId, setStartedId] = useState(handedOffVideo);
  // For the language switch, which reads the player outside React (`playHandoff.ts`).
  const statusRef = useRef<PlayerStatus>("idle");
  const startedRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    const report = (state: PlayerStatus) => {
      statusRef.current = state;
      setStatus(state);
    };
    void loadYouTubeApi().then((YT) => {
      if (cancelled || !host) {
        return;
      }
      const mount = document.createElement("div");
      host.appendChild(mount);
      playerRef.current = createPlayer(YT, mount, {
        onReady: () => !cancelled && setReady(true),
        onStateChange: (e) => {
          const state = STATES[e.data];
          if (cancelled || !state) {
            return;
          }
          report(state);
          if (state === "playing") {
            startedRef.current = currentRef.current;
            setStartedId(currentRef.current);
          }
        },
        onError: () => !cancelled && report("error"),
      });
    });
    const unregister = registerPlayback(() =>
      playback(playerRef.current, currentRef.current, startedRef.current, statusRef.current),
    );
    return () => {
      cancelled = true;
      unregister();
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore
      }
      playerRef.current = null;
      currentRef.current = null;
      if (host) {
        host.innerHTML = "";
      }
    };
  }, []);

  useEffect(() => {
    if (status !== "playing") {
      return;
    }
    const id = window.setInterval(() => {
      setTime(playerRef.current?.getCurrentTime() ?? 0);
    }, 250);
    return () => window.clearInterval(id);
  }, [status]);

  const play = useCallback((videoId: string, start = 0) => {
    const p = playerRef.current;
    if (!p) {
      return;
    }
    if (currentRef.current !== videoId) {
      currentRef.current = videoId;
      setCurrentId(videoId);
      setTime(start);
      statusRef.current = "loading";
      setStatus("loading");
      p.loadVideoById({ videoId, startSeconds: start });
    } else {
      p.playVideo();
    }
  }, []);

  const pause = useCallback(() => playerRef.current?.pauseVideo(), []);

  const toggle = useCallback(
    (videoId: string, start = 0) => {
      if (currentRef.current === videoId && (status === "playing" || status === "loading")) {
        pause();
      } else {
        play(videoId, start);
      }
    },
    [pause, play, status],
  );

  const restart = useCallback((start = 0) => {
    const p = playerRef.current;
    if (!p || !currentRef.current) {
      return;
    }
    p.seekTo(start, true);
    p.playVideo();
  }, []);

  const stop = useCallback(() => {
    playerRef.current?.stopVideo();
    currentRef.current = null;
    setCurrentId(null);
    statusRef.current = "idle";
    setStatus("idle");
    setTime(0);
  }, []);

  const player = useMemo<HiddenPlayer>(
    () => ({ ready, currentId, startedId, status, time, play, pause, toggle, restart, stop }),
    [ready, currentId, startedId, status, time, play, pause, toggle, restart, stop],
  );
  return { hostRef, player };
}

/**
 * Whether the player has heard `videoId` and may place it. A video that won't play
 * counts, so a broken one never blocks the game.
 */
export function hasHeard(
  player: HiddenPlayer,
  song: { youtubeId: string } | null | undefined,
): boolean {
  if (!song) {
    return false;
  }
  const videoId = song.youtubeId;
  return (
    player.startedId === videoId || (player.currentId === videoId && player.status === "error")
  );
}

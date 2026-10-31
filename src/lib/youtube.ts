"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* Minimal typings for the parts of the YouTube IFrame API we use. */
type YTPlayer = {
  loadVideoById(opts: { videoId: string; startSeconds?: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  destroy(): void;
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

let apiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });
  return apiPromise;
}

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

export type HiddenPlayer = ReturnType<typeof useHiddenPlayer>["player"];

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

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    void loadYouTubeApi().then((YT) => {
      if (cancelled || !host) return;
      const mount = document.createElement("div");
      host.appendChild(mount);
      playerRef.current = new YT.Player(mount, {
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
        events: {
          onReady: () => !cancelled && setReady(true),
          onStateChange: (e) => {
            if (cancelled) return;
            // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
            if (e.data === 1) setStatus("playing");
            else if (e.data === 2) setStatus("paused");
            else if (e.data === 0) setStatus("ended");
            else if (e.data === 3) setStatus("loading");
          },
          onError: () => !cancelled && setStatus("error"),
        },
      });
    });
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore
      }
      playerRef.current = null;
      currentRef.current = null;
      if (host) host.innerHTML = "";
    };
  }, []);

  useEffect(() => {
    if (status !== "playing") return;
    const id = window.setInterval(() => {
      setTime(playerRef.current?.getCurrentTime() ?? 0);
    }, 250);
    return () => window.clearInterval(id);
  }, [status]);

  const play = useCallback((videoId: string, start = 0) => {
    const p = playerRef.current;
    if (!p) return;
    if (currentRef.current !== videoId) {
      currentRef.current = videoId;
      setCurrentId(videoId);
      setTime(start);
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
    if (!p || !currentRef.current) return;
    p.seekTo(start, true);
    p.playVideo();
  }, []);

  const stop = useCallback(() => {
    playerRef.current?.stopVideo();
    currentRef.current = null;
    setCurrentId(null);
    setStatus("idle");
    setTime(0);
  }, []);

  const player = useMemo(
    () => ({ ready, currentId, status, time, play, pause, toggle, restart, stop }),
    [ready, currentId, status, time, play, pause, toggle, restart, stop],
  );
  return { hostRef, player };
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The one YouTube player, shared by every game screen. It lives outside React's tree,
 * in a host on <body>, so it outlives the screens: switching language remounts the
 * whole page (the language is the root layout's segment), but the song plays on.
 * Screens read its state (`usePlayer`) and send it commands; nothing else touches it.
 *
 * The iframe is never visible: its host sits behind the page content and is fully
 * transparent, so the title, channel, thumbnail and comments can't be seen. It's out
 * of reach too (`inert`, `aria-hidden`, no pointer events), and YouTube's own controls
 * are off.
 */

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

type PlayerEvents = {
  onReady?: () => void;
  onStateChange?: (e: { data: number }) => void;
  onError?: (e: { data: number }) => void;
};

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      width: string | number;
      height: string | number;
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: PlayerEvents;
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

type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

export type PlayerState = {
  ready: boolean;
  /** The video loaded in the player. */
  currentId: string | null;
  /** The last video that actually started playing (the player has heard it). */
  startedId: string | null;
  status: PlayerStatus;
  time: number;
};

export const IDLE_PLAYER: PlayerState = {
  ready: false,
  currentId: null,
  startedId: null,
  status: "idle",
  time: 0,
};

/** The player states we follow, by YouTube's numbers (-1 unstarted and 5 cued are left out). */
const STATES: Partial<Record<number, PlayerStatus>> = {
  0: "ended",
  1: "playing",
  2: "paused",
  3: "loading",
};

/** How long (ms) a language switch keeps the player for the page it opens. */
const HOLD = 10_000;

let state = IDLE_PLAYER;
const listeners = new Set<() => void>();
let yt: YTPlayer | null = null;
let host: HTMLElement | null = null;
// Bumped when the player goes, so a late API load or event from the old one is ignored.
let generation = 0;
let screens = 0;
let holdUntil = 0;
let releaseTimer = 0;
let ticker = 0;

function set(patch: Partial<PlayerState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) {
    listener();
  }
  // While playing, follow the time a few times a second.
  if (state.status === "playing" && !ticker) {
    ticker = window.setInterval(() => set({ time: yt?.getCurrentTime() ?? 0 }), 250);
  } else if (state.status !== "playing" && ticker) {
    window.clearInterval(ticker);
    ticker = 0;
  }
}

export function subscribePlayer(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function playerState(): PlayerState {
  return state;
}

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

function onStateChange(e: { data: number }) {
  const status = STATES[e.data];
  if (!status) {
    return;
  }
  set(status === "playing" ? { status, startedId: state.currentId } : { status });
}

function create() {
  const made = generation;
  host = document.createElement("div");
  host.className = "player-host";
  host.inert = true;
  host.setAttribute("aria-hidden", "true");
  const mount = document.createElement("div");
  host.appendChild(mount);
  document.body.appendChild(host);
  const live = (fn: () => void) => () => {
    if (made === generation) {
      fn();
    }
  };
  void loadYouTubeApi().then(
    live(() => {
      const YT = window.YT;
      if (!YT) {
        return;
      }
      yt = new YT.Player(mount, {
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
          onReady: live(() => set({ ready: true })),
          onStateChange: (e) => live(() => onStateChange(e))(),
          onError: live(() => set({ status: "error" })),
        },
      });
    }),
  );
}

function destroy() {
  generation += 1;
  try {
    yt?.destroy();
  } catch {
    // The player may already be gone.
  }
  yt = null;
  host?.remove();
  host = null;
  set(IDLE_PLAYER);
}

/**
 * A game screen opens: it gets the player, made on first use. Returns its goodbye:
 * when the last screen goes, so does the player (and the song), unless another screen
 * takes it straight away (a remount) or a language switch asked to keep it.
 */
export function attachPlayer(): () => void {
  screens += 1;
  window.clearTimeout(releaseTimer);
  holdUntil = 0;
  if (!host) {
    create();
  }
  return () => {
    screens -= 1;
    if (screens > 0) {
      return;
    }
    const goIfUnused = () => {
      if (screens === 0) {
        destroy();
      }
    };
    const held = holdUntil - Date.now();
    if (held > 0) {
      releaseTimer = window.setTimeout(goIfUnused, held);
    } else {
      queueMicrotask(goIfUnused);
    }
  };
}

/** The language switch: keep the player (and its song) for the page about to open. */
export function holdPlayer(): void {
  holdUntil = Date.now() + HOLD;
}

export function playVideo(videoId: string, start = 0): void {
  if (!yt) {
    return;
  }
  if (state.currentId !== videoId) {
    set({ currentId: videoId, time: start, status: "loading" });
    yt.loadVideoById({ videoId, startSeconds: start });
  } else {
    yt.playVideo();
  }
}

export function pauseVideo(): void {
  yt?.pauseVideo();
}

export function toggleVideo(videoId: string, start = 0): void {
  if (state.currentId === videoId && (state.status === "playing" || state.status === "loading")) {
    pauseVideo();
  } else {
    playVideo(videoId, start);
  }
}

export function restartVideo(start = 0): void {
  if (!yt || !state.currentId) {
    return;
  }
  yt.seekTo(start, true);
  yt.playVideo();
}

export function stopVideo(): void {
  yt?.stopVideo();
  set({ currentId: null, status: "idle", time: 0 });
}

/**
 * Whether the player has heard `song` and may place it. A video that won't play
 * counts, so a broken one never blocks the game.
 */
export function hasHeard(
  player: PlayerState,
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

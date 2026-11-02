type YouTubeApi = NonNullable<Window["YT"]>;
type PlayerOptions = ConstructorParameters<YouTubeApi["Player"]>[1];

/**
 * Stands in for YouTube's IFrame API, the one thing tests can't reach, so the real
 * `useHiddenPlayer` runs on top of it. Tests read what the game asked of it, and use
 * `failVideo` to simulate a video that won't play.
 */
export const fakeYouTube = {
  stops: 0,
  pauses: 0,
  failVideo: (): void => {
    throw new Error("No player has been created yet");
  },
};

export function installFakeYouTube() {
  fakeYouTube.stops = 0;
  fakeYouTube.pauses = 0;
  window.YT = {
    Player: class {
      constructor(_el: HTMLElement, opts: PlayerOptions) {
        fakeYouTube.failVideo = () => opts.events?.onError?.({ data: 150 });
        opts.events?.onReady?.();
      }
      loadVideoById = () => undefined;
      playVideo = () => undefined;
      pauseVideo = () => {
        fakeYouTube.pauses += 1;
      };
      stopVideo = () => {
        fakeYouTube.stops += 1;
      };
      seekTo = () => undefined;
      getCurrentTime = () => 0;
      destroy = () => undefined;
    },
  };
}

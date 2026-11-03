type YouTubeApi = NonNullable<Window["YT"]>;
type PlayerOptions = ConstructorParameters<YouTubeApi["Player"]>[1];

/**
 * Stands in for YouTube's IFrame API, the one thing tests can't reach, so the real
 * shared player (`lib/services/player.ts`) runs on top of it. Like the real one, it says a video is playing
 * as soon as it's asked to play, and paused when asked to pause. Tests read what the
 * game asked of it, and use `failVideo` to simulate a video that won't play.
 */
export const fakeYouTube = {
  loads: 0,
  destroys: 0,
  stops: 0,
  pauses: 0,
  failVideo: (): void => {
    throw new Error("No player has been created yet");
  },
};

export function installFakeYouTube() {
  fakeYouTube.loads = 0;
  fakeYouTube.destroys = 0;
  fakeYouTube.stops = 0;
  fakeYouTube.pauses = 0;
  window.YT = {
    Player: class {
      private readonly events: PlayerOptions["events"];
      constructor(_el: HTMLElement, opts: PlayerOptions) {
        this.events = opts.events;
        fakeYouTube.failVideo = () => opts.events?.onError?.({ data: 150 });
        opts.events?.onReady?.();
      }
      loadVideoById = () => {
        fakeYouTube.loads += 1;
        this.events?.onStateChange?.({ data: 1 });
      };
      playVideo = () => this.events?.onStateChange?.({ data: 1 });
      pauseVideo = () => {
        fakeYouTube.pauses += 1;
        this.events?.onStateChange?.({ data: 2 });
      };
      stopVideo = () => {
        fakeYouTube.stops += 1;
      };
      seekTo = () => undefined;
      getCurrentTime = () => 0;
      destroy = () => {
        fakeYouTube.destroys += 1;
      };
    },
  };
}

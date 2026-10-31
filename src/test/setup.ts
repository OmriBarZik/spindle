// jsdom has no AnimationEvent, so React would listen for a vendor-prefixed
// "animationend" and miss the events tests fire. Define it before React loads.
if (typeof window !== "undefined" && !("AnimationEvent" in window)) {
  class AnimationEvent extends Event {}
  Object.assign(window, { AnimationEvent });
}

"use client";

/**
 * Bring `el` to the middle of the screen with a smooth glide that can't lag.
 *
 * Scrolling from JavaScript (or `behavior: "smooth"` in some browsers) moves
 * the page one frame at a time on the main thread, so it stutters whenever
 * React, the YouTube iframe or anything else is busy, which is exactly when a
 * guess is placed. Instead the page jumps to its final scroll position at once
 * and the content is slid there with a transform (a FLIP animation). The
 * browser runs that on the compositor, off the main thread. Call it from a
 * layout effect, so the jump and the start of the glide land in the same frame.
 *
 * Returns a function that ends the glide early.
 */
export function smoothScrollToCenter(el: HTMLElement): () => void {
  const r = el.getBoundingClientRect();
  const maxY = document.documentElement.scrollHeight - window.innerHeight;
  const from = window.scrollY;
  const to = Math.min(maxY, Math.max(0, from + r.top + r.height / 2 - window.innerHeight / 2));
  const distance = to - from;
  if (Math.abs(distance) < 1) return () => {};

  window.scrollTo({ top: to, behavior: "instant" });
  const page = document.body;
  if (
    typeof page.animate !== "function" ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    return () => {};
  }

  // Longer trips take a little longer, but always end well before the record swipes.
  const duration = Math.min(800, Math.max(500, 350 + Math.abs(distance) * 0.5));
  // Start where the content was before the jump, then glide to where it is now.
  const glide = page.animate(
    [{ transform: `translateY(${distance}px)` }, { transform: "none" }],
    { duration, easing: "cubic-bezier(0.65, 0, 0.35, 1)" },
  );

  // If the player grabs the page, finish at once rather than fight them.
  const end = () => {
    glide.finish();
    for (const ev of ["wheel", "touchstart", "keydown"] as const) window.removeEventListener(ev, end);
  };
  for (const ev of ["wheel", "touchstart", "keydown"] as const)
    window.addEventListener(ev, end, { passive: true });
  glide.onfinish = end;
  return end;
}

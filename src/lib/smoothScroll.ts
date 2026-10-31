"use client";

/**
 * Scroll the page so `el` is centered, with our own easing instead of the
 * browser's `behavior: "smooth"`, which is quick and jerky in some browsers and
 * differs between them. Stops as soon as the player scrolls or touches the page.
 * Returns a function that cancels the scroll.
 */
export function smoothScrollToCenter(el: HTMLElement): () => void {
  const r = el.getBoundingClientRect();
  const maxY = document.documentElement.scrollHeight - window.innerHeight;
  const from = window.scrollY;
  const to = Math.min(maxY, Math.max(0, from + r.top + r.height / 2 - window.innerHeight / 2));
  const distance = to - from;
  if (Math.abs(distance) < 1) return () => {};

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, to);
    return () => {};
  }

  // Longer trips take a little longer, but always end well before the record swipes.
  const duration = Math.min(800, Math.max(500, 350 + Math.abs(distance) * 0.5));
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  let frame = 0;
  let start: number | null = null;

  const stop = () => {
    cancelAnimationFrame(frame);
    for (const ev of ["wheel", "touchstart", "keydown"] as const) window.removeEventListener(ev, stop);
  };
  const step = (now: number) => {
    start ??= now;
    const t = Math.min(1, (now - start) / duration);
    window.scrollTo(0, from + distance * ease(t));
    if (t < 1) frame = requestAnimationFrame(step);
    else stop();
  };
  for (const ev of ["wheel", "touchstart", "keydown"] as const)
    window.addEventListener(ev, stop, { passive: true });
  frame = requestAnimationFrame(step);
  return stop;
}

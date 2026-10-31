/**
 * Whether to run JavaScript animations: the Web Animations API is there and the
 * player hasn't asked for reduced motion. Everything animated works without it.
 */
export function canAnimate(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (typeof document.body.animate !== "function") return false;
  return typeof window.matchMedia !== "function"
    ? true
    : !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Hold an element at opacity 0 with a finished, filled animation rather than an
 * inline style, so React's own styles are untouched. Cancel the result to undo.
 * Returns null where the Web Animations API is missing.
 */
export function holdHidden(el: HTMLElement): Animation | null {
  if (typeof el.animate !== "function") return null;
  return el.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 0, fill: "forwards" });
}

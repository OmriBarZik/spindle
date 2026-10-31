"use client";

import { useEffect, useLayoutEffect } from "react";

/**
 * The record "flight" from the home page into a game.
 *
 * When a mode card is clicked, a copy of the home record (the "ghost") is pinned
 * to the screen at the exact spot and angle of the real one. It keeps spinning
 * while the game page and its client-only chunk load, so there is never a gap.
 * When the game's Deck mounts, the ghost is removed and the Deck animates from
 * the ghost's position, size and angle into its own place (a FLIP animation).
 *
 * It uses plain DOM and the Web Animations API (`element.animate`), which every
 * current browser supports, rather than the View Transitions API. Anything
 * missing (no `animate`, reduced motion, a full page load) just skips the
 * animation; the game works the same either way.
 */

const DURATION = 650;
const EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";
/** Fade-in of the game screen's text once the record has landed. */
const FADE_IN = 350;
/** Give up on a flight that no Deck picks up (slow network, finished game). */
const TIMEOUT = 10000;
/** Same as `.spin-slow` in globals.css. */
const SPIN_SLOW_MS = 8000;

/** `landing` is set while a Deck has taken over the flight. */
type Flight = { ghost: HTMLElement; timer: ReturnType<typeof setTimeout>; landing: boolean };
let flight: Flight | null = null;

function canAnimate(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (typeof document.body?.animate !== "function") return false;
  return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Current rotation in degrees (0..360) of an element, from its computed transform. */
function angleOf(el: Element): number {
  const t = getComputedStyle(el).transform;
  const m = t && t !== "none" ? t.match(/matrix(?:3d)?\(([^)]+)\)/) : null;
  if (!m) return 0;
  const [a, b] = m[1].split(",").map(Number);
  const deg = (Math.atan2(b, a) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** Center and size of a (possibly rotating) circle, ignoring the rotation. */
function boxOf(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, size: el.offsetWidth };
}

/** Hide or show an element without changing layout (also hides iframes inside). */
function setHidden(el: HTMLElement, hidden: boolean) {
  el.style.visibility = hidden ? "hidden" : "";
}

/**
 * Everything on the game screen around the Deck's record: walk up from `box`
 * to the page's <main> and collect the siblings at each level (the title,
 * intro, deck label, timeline, …).
 */
function surroundings(box: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (let el: HTMLElement | null = box; el && el.tagName !== "MAIN"; el = el.parentElement) {
    const parent: HTMLElement | null = el.parentElement;
    if (!parent) break;
    for (const sib of Array.from(parent.children)) {
      if (sib !== el && sib instanceof HTMLElement) out.push(sib);
    }
  }
  return out;
}

/**
 * Hold elements at opacity 0. Done with a finished, filled animation rather
 * than inline styles, so React's own styles are untouched; cancel to undo.
 */
function holdHidden(els: HTMLElement[]): Animation[] {
  return els.map((el) => el.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 0, fill: "forwards" }));
}

function removeGhost(fade: boolean) {
  const f = flight;
  if (!f) return;
  flight = null;
  clearTimeout(f.timer);
  if (!fade) {
    f.ghost.remove();
    return;
  }
  const anim = f.ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: "forwards" });
  anim.onfinish = () => f.ghost.remove();
}

/** Start a flight from the home record. Call it from the link's click handler. */
export function launchRecordFlight(record: HTMLElement | null) {
  if (!record || !canAnimate()) return;
  removeGhost(false);

  const { cx, cy, size } = boxOf(record);
  const angle = angleOf(record);

  const ghost = record.cloneNode(true) as HTMLElement;
  ghost.removeAttribute("data-flight-record");
  ghost.setAttribute("aria-hidden", "true");
  ghost.className = "record spin-slow";
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${cx - size / 2}px`,
    top: `${cy - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    margin: "0",
    borderRadius: "9999px",
    zIndex: "50",
    pointerEvents: "none",
    // Keep turning from the same angle the real record is at.
    animationDelay: `${-(angle / 360) * SPIN_SLOW_MS}ms`,
  });
  document.body.appendChild(ghost);

  flight = { ghost, timer: setTimeout(() => removeGhost(true), TIMEOUT), landing: false };
}

/** Let a game screen without a Deck (e.g. a finished Daily Five) fade the ghost out. */
export function useDropRecordFlight() {
  useEffect(() => {
    if (!flight?.landing) removeGhost(true);
  }, []);
}

/** True while a record is on its way, so loading screens can stay out of its way. */
export function isRecordFlying(): boolean {
  return flight !== null;
}

/**
 * Land a flight on the Deck. `box` is the Deck's record area (record, ring,
 * hidden player and play button) and `button` fades in once the record lands,
 * together with the rest of the game screen (title, text, timeline), so the
 * page doesn't appear in pieces around a record still in the air.
 *
 * The ghost itself flies, and the Deck stays hidden (`visibility`, which also
 * hides the YouTube iframe) until it lands. The flight starts a couple of
 * frames after the Deck mounts, once the new page has laid out and the heavy
 * mount work is done, so a slow page (seen in Firefox) can't make it stutter
 * or land in the wrong place. Until then the ghost keeps spinning in place.
 */
export function useRecordLanding(
  box: React.RefObject<HTMLElement | null>,
  button: React.RefObject<HTMLElement | null>,
) {
  // Layout effect: hide the Deck before its first paint.
  useLayoutEffect(() => {
    const f = flight;
    const boxEl = box.current;
    if (!f || !boxEl) return;

    clearTimeout(f.timer);
    f.landing = true;
    setHidden(boxEl, true);
    const around = surroundings(boxEl);
    const holds = holdHidden(around);
    let anim: Animation | null = null;
    let raf = 0;

    const land = () => {
      if (flight === f) flight = null;
      f.ghost.remove();
      setHidden(boxEl, false);
      holds.forEach((h) => h.cancel());
      const fadeIn = { duration: FADE_IN, easing: "ease-out" };
      for (const el of around) el.animate([{ opacity: 0 }, { opacity: getComputedStyle(el).opacity }], fadeIn);
      const btn = button.current;
      btn?.animate([{ opacity: 0 }, { opacity: getComputedStyle(btn).opacity }], fadeIn);
    };

    const fly = () => {
      const from = boxOf(f.ghost);
      const to = boxOf(boxEl);
      if (!to.size || !from.size) return land();
      const angle = angleOf(f.ghost);
      // Finish a little over a quarter turn later, on a whole turn, so it
      // matches the Deck's record at 0deg.
      const end = Math.ceil((angle + 100) / 360) * 360;
      const move = `translate(${to.cx - from.cx}px, ${to.cy - from.cy}px) scale(${to.size / from.size})`;
      f.ghost.style.animation = "none";
      anim = f.ghost.animate(
        [
          { transform: `translate(0px, 0px) scale(1) rotate(${angle}deg)` },
          { transform: `${move} rotate(${end}deg)` },
        ],
        { duration: DURATION, easing: EASING, fill: "forwards" },
      );
      anim.onfinish = land;
    };

    // Two frames: the first lets the browser lay out and paint the new page.
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(fly);
    });

    return () => {
      // Unmounted mid-flight (or React's dev double-mount): put things back so
      // a remount can start over.
      cancelAnimationFrame(raf);
      if (anim) {
        anim.onfinish = null;
        anim.cancel();
        f.ghost.style.animation = "";
      }
      setHidden(boxEl, false);
      holds.forEach((h) => h.cancel());
      f.landing = false;
      if (flight === f) f.timer = setTimeout(() => removeGhost(true), TIMEOUT);
    };
  }, [box, button]);
}

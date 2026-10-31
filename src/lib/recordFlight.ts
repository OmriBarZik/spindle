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
/** Give up on a flight that no Deck picks up (slow network, finished game). */
const TIMEOUT = 5000;
/** Same as `.spin-slow` in globals.css. */
const SPIN_SLOW_MS = 8000;

type Flight = { ghost: HTMLElement; timer: ReturnType<typeof setTimeout> };
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

  flight = { ghost, timer: setTimeout(() => removeGhost(true), TIMEOUT) };
}

/** Let a game screen without a Deck (e.g. a finished Daily Five) fade the ghost out. */
export function useDropRecordFlight() {
  useEffect(() => removeGhost(true), []);
}

/**
 * Land a flight on the Deck: `box` is the element to move (record plus button),
 * `record` the spinning disc inside it, `extras` anything to fade in.
 */
export function useRecordLanding(
  box: React.RefObject<HTMLElement | null>,
  record: React.RefObject<HTMLElement | null>,
  extras: React.RefObject<HTMLElement | null>,
) {
  // Layout effect: start the animation before the first paint so the Deck is
  // never seen in its final place first.
  useLayoutEffect(() => {
    const f = flight;
    const boxEl = box.current;
    const recordEl = record.current;
    if (!f || !boxEl || !recordEl) return;

    const from = boxOf(f.ghost);
    const angle = angleOf(f.ghost);
    removeGhost(false);

    const to = boxOf(boxEl);
    if (!to.size) return;
    const dx = from.cx - to.cx;
    const dy = from.cy - to.cy;
    const scale = from.size / to.size;
    // Finish a little over a quarter turn later, on a whole turn, so it settles at 0deg.
    const end = Math.ceil((angle + 100) / 360) * 360;

    const opts: KeyframeAnimationOptions = { duration: DURATION, easing: EASING };
    boxEl.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
        { transform: "translate(0px, 0px) scale(1)" },
      ],
      opts,
    );
    recordEl.animate([{ transform: `rotate(${angle}deg)` }, { transform: `rotate(${end}deg)` }], opts);
    const extrasEl = extras.current;
    if (extrasEl) {
      const opacity = Number(getComputedStyle(extrasEl).opacity) || 1;
      extrasEl.animate([{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity }], opts);
    }
  }, [box, record, extras]);
}

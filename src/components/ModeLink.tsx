"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect } from "react";
import { preloadGames } from "@/components/ClientOnly";
import { launchRecordFlight } from "@/lib/recordFlight";

/** The home page's content, faded out on click (see below). */
let homeFade: Animation | null = null;

/** Hide the home page's <main> right away. It stays hidden until it unmounts. */
function fadeOutHome(main: HTMLElement | null) {
  homeFade?.cancel();
  homeFade = main?.animate?.([{ opacity: 0 }, { opacity: 0 }], { duration: 0, fill: "forwards" }) ?? null;
}

/**
 * A link into a game that sends the home page's record flying into the game's
 * Deck, and starts the game at the top of the page.
 */
export default function ModeLink(props: React.ComponentProps<typeof Link>) {
  // Load the game code while the player reads the home page, so the record
  // has somewhere to land right away (slow first loads broke the flight).
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(preloadGames);
    else setTimeout(preloadGames, 300);
  }, []);

  // Next may keep the home page around and show it again on Back: make sure
  // it isn't still faded out from the click that left it.
  useLayoutEffect(() => {
    homeFade?.cancel();
    homeFade = null;
  }, []);

  return (
    <Link
      {...props}
      // We scroll to the top ourselves, on click (below). Next's own scroll
      // happens later, after the game has shown, which made the page jump.
      scroll={false}
      onPointerEnter={(e) => {
        props.onPointerEnter?.(e);
        preloadGames();
      }}
      onPointerDown={(e) => {
        props.onPointerDown?.(e);
        preloadGames();
      }}
      onClick={(e) => {
        props.onClick?.(e);
        // Only for a plain click that stays in this tab (client-side navigation).
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        // Pin the record where it is now (it's position: fixed, so scrolling
        // won't move it), hide the rest of the home page so the jump below
        // isn't seen, then start the game at the top of the page.
        launchRecordFlight(document.querySelector<HTMLElement>("[data-flight-record]"));
        fadeOutHome(e.currentTarget.closest("main"));
        window.scrollTo(0, 0);
      }}
    />
  );
}

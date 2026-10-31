"use client";

import Link from "next/link";
import { useEffect } from "react";
import { preloadGames } from "@/components/ClientOnly";
import { launchRecordFlight } from "@/lib/recordFlight";

/** A link into a game that sends the home page's record flying into the game's Deck. */
export default function ModeLink(props: React.ComponentProps<typeof Link>) {
  // Load the game code while the player reads the home page, so the record
  // has somewhere to land right away (slow first loads broke the flight).
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(preloadGames);
    else setTimeout(preloadGames, 300);
  }, []);

  return (
    <Link
      {...props}
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
        launchRecordFlight(document.querySelector<HTMLElement>("[data-flight-record]"));
      }}
    />
  );
}

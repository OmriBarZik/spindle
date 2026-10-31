"use client";

import Link from "next/link";
import { launchRecordFlight } from "@/lib/recordFlight";

/** A link into a game that sends the home page's record flying into the game's Deck. */
export default function ModeLink(props: React.ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        // Only for a plain click that stays in this tab (client-side navigation).
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        launchRecordFlight(document.querySelector<HTMLElement>("[data-flight-record]"));
      }}
    />
  );
}

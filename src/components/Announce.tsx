"use client";

import type { ReactNode } from "react";

/**
 * Text for screen readers only, read out when it changes (e.g. "Correct!").
 * Always mounted, since a live region added together with its text is often missed.
 * It's absolutely positioned, so it takes no space in flex or grid layouts.
 */
export function Announce({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  );
}

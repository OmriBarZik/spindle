"use client";

import { createContext, useContext } from "react";

/**
 * Placement layouts being tried out. "classic" is the original vertical list.
 * - "compact": small sticky player on top, slim rows, tap a gap twice to place.
 * - "dock": the original list, with a player + "Place it" bar pinned to the bottom.
 * - "chips": the line as wrapped year chips, so a long timeline fits on one screen.
 */
export const DESIGNS = ["classic", "compact", "dock", "chips"] as const;
export type Design = (typeof DESIGNS)[number];

const KEY = "spindle:design";

function isDesign(value: unknown): value is Design {
  return DESIGNS.includes(value as Design);
}

/** `?design=` in the URL wins (so links can pick one), then the last choice, then classic. */
export function readDesign(): Design {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("design");
    if (isDesign(fromUrl)) {
      window.localStorage.setItem(KEY, fromUrl);
      return fromUrl;
    }
    const saved = window.localStorage.getItem(KEY);
    if (isDesign(saved)) return saved;
  } catch {
    // Storage blocked: fall back to the original layout.
  }
  return "classic";
}

/**
 * Switch layouts. The page reloads, because the hidden YouTube player lives in a
 * fixed spot in the DOM and each layout puts the record somewhere else.
 */
export function chooseDesign(design: Design) {
  try {
    window.localStorage.setItem(KEY, design);
  } catch {
    // The URL below still carries the choice for this page.
  }
  const url = new URL(window.location.href);
  url.searchParams.set("design", design);
  window.location.assign(url);
}

export const DesignContext = createContext<Design>("classic");

export function useDesign(): Design {
  return useContext(DesignContext);
}

"use client";

import { useEffect, useEffectEvent } from "react";

/** Controls that handle the key themselves (a focused button already clicks on Enter). */
const OWN_KEYS = "a, button, input, select, textarea, summary, [contenteditable]";

/**
 * A page-wide shortcut, for keyboard players on a desktop: `key` (as in
 * `KeyboardEvent.key`) calls `run` while `enabled`, unless the focus is on a control
 * that uses the key itself, or a modifier is held (those are the browser's).
 */
export function useKeyShortcut(key: string, enabled: boolean, run: () => void) {
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== key || e.repeat || e.defaultPrevented) {
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
      return;
    }
    if (e.target instanceof Element && e.target.closest(OWN_KEYS)) {
      return;
    }
    e.preventDefault();
    run();
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}

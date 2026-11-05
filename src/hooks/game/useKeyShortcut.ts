"use client";

import { useEffect, useEffectEvent } from "react";

/** Controls that handle the key themselves (a focused button already clicks on Enter). */
const OWN_KEYS = "a, button, input, select, textarea, summary, [contenteditable]";

/**
 * What still gets a claimed key: links (so keyboard players can leave the page) and
 * text fields. Buttons don't.
 */
const KEEP_KEYS = "a[href], input, select, textarea, [contenteditable]";

/** A modifier makes the key the browser's (Ctrl+Enter, Shift+Space, …). */
function hasModifier(e: KeyboardEvent) {
  return e.altKey || e.ctrlKey || e.metaKey || e.shiftKey;
}

/**
 * A page-wide shortcut, for keyboard players on a desktop: `key` (as in
 * `KeyboardEvent.key`) calls `run` while `enabled`, unless the focus is on a control
 * that uses the key itself, or a modifier is held (those are the browser's).
 *
 * With `claim`, the key belongs to the shortcut while the component is mounted, even
 * on a focused button: the button is never activated by it (so a play button clicked
 * with the mouse, which keeps the focus, can't pause the song on Enter), and while not
 * `enabled` the key does nothing at all. Links and text fields keep it.
 */
export function useKeyShortcut(
  key: string,
  enabled: boolean,
  run: () => void,
  { claim = false }: { claim?: boolean } = {},
) {
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== key || e.defaultPrevented) {
      return;
    }
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest(claim ? KEEP_KEYS : OWN_KEYS)) {
      return;
    }
    if (claim && target?.closest("button, summary, [role='button']")) {
      // The focused button never gets the key, not even with a modifier.
      e.preventDefault();
    }
    if (!enabled || e.repeat || hasModifier(e)) {
      return;
    }
    e.preventDefault();
    run();
  });

  const listening = enabled || claim;
  useEffect(() => {
    if (!listening) {
      return;
    }
    // A claimed key is caught first (capture), before the focused control sees it.
    const options = { capture: claim };
    window.addEventListener("keydown", onKeyDown, options);
    return () => window.removeEventListener("keydown", onKeyDown, options);
  }, [listening, claim]);
}

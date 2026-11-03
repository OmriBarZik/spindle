"use client";

import { useI18n } from "@/i18n/I18nProvider";

/**
 * The keyboard shortcuts, under the place button. Shown only with a mouse or trackpad
 * (`.key-hints`); screen readers get them from each control's `aria-keyshortcuts`.
 */
export function KeyHints() {
  const { t } = useI18n();
  const { keys } = t.common;
  return (
    <p aria-hidden className="key-hints">
      <span>
        {/* Arrows point at the screen's left and right, in both directions. */}
        <kbd dir="ltr">← →</kbd> {keys.move}
      </span>
      <span>
        <kbd>{keys.space}</kbd> {keys.play}
      </span>
      <span>
        <kbd>{keys.enter}</kbd> {keys.place}
      </span>
    </p>
  );
}

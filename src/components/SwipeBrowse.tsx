"use client";

import { useI18n } from "@/i18n/I18nProvider";

/** Earlier / Later for a finished line: each press moves the strip by one card. */
export function SwipeBrowse({ onStep }: { onStep: (delta: number) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex justify-center gap-150">
      <button
        type="button"
        onClick={() => onStep(-1)}
        aria-label={t.common.earlier}
        className="swipe-step"
      >
        <span aria-hidden className="rtl:-scale-x-100">
          ‹
        </span>
      </button>
      <button
        type="button"
        onClick={() => onStep(1)}
        aria-label={t.common.later}
        className="swipe-step"
      >
        <span aria-hidden className="rtl:-scale-x-100">
          ›
        </span>
      </button>
    </div>
  );
}

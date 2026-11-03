"use client";

import { useI18n } from "@/i18n/I18nProvider";

/** Under the record: what the player is doing, or why the song can't play. */
export function DeckStatus({
  text,
  errored,
  onSkip,
}: {
  text: string;
  errored: boolean;
  onSkip?: () => void;
}) {
  const { t } = useI18n();
  if (!errored) {
    // Fixed height so the page doesn't jump when loading ends.
    return (
      <p role="status" aria-live="polite" className="h-250 text-sm leading-250 text-muted">
        {text}
      </p>
    );
  }
  return (
    <div className="max-w-narrow text-center text-sm text-warning-ink">
      {t.common.cantPlay}
      {onSkip ? (
        <button type="button" onClick={onSkip} className="mt-100 block w-full underline">
          {t.common.differentSong}
        </button>
      ) : null}
    </div>
  );
}

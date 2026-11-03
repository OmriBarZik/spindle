"use client";

import { useState } from "react";
import { Announce } from "@/components/game/Announce";
import { useI18n } from "@/i18n/I18nProvider";
import { shareOrCopy } from "@/lib/games/share";
import { type GameMode, track } from "@/lib/services/analytics";

export function ShareButton({
  text,
  mode,
  label,
}: {
  text: string;
  mode: GameMode;
  /** The button's text, when it isn't "Share result". */
  label?: string;
}) {
  const { t } = useI18n();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const r = await shareOrCopy(text);
          track("share", { content_type: mode, method: r });
          setMsg({ copied: t.common.copied, failed: t.common.copyFailed, shared: null }[r]);
          if (r !== "shared") {
            window.setTimeout(() => setMsg(null), 2000);
          }
        }}
        className="btn-primary"
      >
        {msg ?? label ?? t.common.shareResult}
      </button>
      {/* Screen readers don't announce a button's label changing, so say it here too. */}
      <Announce>{msg}</Announce>
    </>
  );
}

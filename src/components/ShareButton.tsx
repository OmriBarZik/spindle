"use client";

import { useState } from "react";
import { Announce } from "@/components/TimelineParts";
import { useI18n } from "@/i18n/I18nProvider";
import { shareOrCopy } from "@/lib/share";

export default function ShareButton({ text }: { text: string }) {
  const { t } = useI18n();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const r = await shareOrCopy(text);
          setMsg(r === "copied" ? t.common.copied : r === "failed" ? t.common.copyFailed : null);
          if (r !== "shared") window.setTimeout(() => setMsg(null), 2000);
        }}
        className="btn-primary"
      >
        {msg ?? t.common.shareResult}
      </button>
      {/* Screen readers don't announce a button's label changing, so say it here too. */}
      <Announce>{msg}</Announce>
    </>
  );
}

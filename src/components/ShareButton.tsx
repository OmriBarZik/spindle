"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { shareText } from "@/lib/share";

export default function ShareButton({ text }: { text: string }) {
  const { t } = useI18n();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <button
      type="button"
      onClick={async () => {
        const r = await shareText(text);
        setMsg(r === "copied" ? t.common.copied : r === "failed" ? t.common.copyFailed : null);
        if (r !== "shared") window.setTimeout(() => setMsg(null), 2000);
      }}
      className="btn-primary"
    >
      {msg ?? t.common.shareResult}
    </button>
  );
}

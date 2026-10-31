"use client";

import { useState } from "react";
import { shareText } from "@/lib/share";

export default function ShareButton({ text }: { text: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <button
      type="button"
      onClick={async () => {
        const r = await shareText(text);
        setMsg(r === "copied" ? "Copied!" : r === "failed" ? "Couldn't copy" : null);
        if (r !== "shared") window.setTimeout(() => setMsg(null), 2000);
      }}
      className="btn-primary"
    >
      {msg ?? "Share result"}
    </button>
  );
}

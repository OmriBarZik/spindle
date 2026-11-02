import { clsx } from "clsx";
import type { ReactNode } from "react";

export function SortFeedbackBox({ correct, children }: { correct: boolean; children: ReactNode }) {
  return (
    <p
      className={clsx(
        "rounded-xl px-3 py-2 text-center text-sm",
        correct ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300",
      )}
    >
      {children}
    </p>
  );
}

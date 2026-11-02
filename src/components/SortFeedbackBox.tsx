import { clsx } from "clsx";
import type { ReactNode } from "react";

export function SortFeedbackBox({ correct, children }: { correct: boolean; children: ReactNode }) {
  return (
    <p
      className={clsx(
        "rounded-control px-150 py-100 text-center text-sm",
        correct ? "bg-success/15 text-success-ink" : "bg-danger/15 text-danger-ink",
      )}
    >
      {children}
    </p>
  );
}

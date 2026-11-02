import type { ReactNode } from "react";

/** The end-of-day box with the result, stats and share button. */
export function ResultCard({ children }: { children: ReactNode }) {
  return (
    <section className="card flex flex-col items-center gap-200 p-250 text-center">
      {children}
    </section>
  );
}

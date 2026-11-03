import { clsx } from "clsx";

/** A row of hearts: `left` filled, the rest outlined. Named by `label` for screen readers. */
export function Hearts({ left, total, label }: { left: number; total: number; label: string }) {
  return (
    <div className="flex justify-center gap-100" role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={clsx("heart size-300", i < left ? "heart-full" : "heart-empty")}
          aria-hidden
        >
          <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3.2 1.7-2.1 3.2-3.2 5.3-3.2 3.7 0 5.8 3.8 4.3 7.3C19.5 16.4 12 21 12 21z" />
        </svg>
      ))}
    </div>
  );
}

import { clsx } from "clsx";

/** The big button's icon: a pause sign, or a play triangle nudged to look centered. */
export function DeckPlayIcon({ pause, small }: { pause: boolean; small: boolean }) {
  const size = small ? "size-300" : "size-350";
  if (pause) {
    return (
      <svg viewBox="0 0 24 24" className={size} fill="currentColor" aria-hidden>
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className={clsx(size, small ? "ml-25" : "ml-50")}
      fill="currentColor"
      aria-hidden
    >
      {/* Play icons point right in every language, so this offset stays physical. */}
      <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
    </svg>
  );
}

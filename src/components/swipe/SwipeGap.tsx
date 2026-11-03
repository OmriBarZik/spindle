import { clsx } from "clsx";

/**
 * A gap between two cards. Its glow spans the rail from the older card's year to
 * the newer one's; it only shows on the gap under the record, and fades in and out
 * there (opacity only), so moving between gaps costs no layout.
 */
export function SwipeGap({ slot, count, on }: { slot: number; count: number; on: boolean }) {
  return (
    <li aria-hidden className={clsx("swipe-gap", on && "swipe-gap-on")} data-gap={slot}>
      <span
        className={clsx(
          "swipe-glow",
          slot === 0 && "swipe-glow-open-start",
          slot === count && slot !== 0 && "swipe-glow-open-end",
        )}
      />
    </li>
  );
}

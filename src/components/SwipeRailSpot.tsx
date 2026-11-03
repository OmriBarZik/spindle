/** A card's (or a stack's) spot on the time rail: its stem, node and year. */
export function SwipeRailSpot({ year }: { year: number }) {
  return (
    <>
      <span aria-hidden className="swipe-stem" />
      <span aria-hidden className="swipe-node" />
      <span aria-hidden className="swipe-year">
        {year}
      </span>
    </>
  );
}

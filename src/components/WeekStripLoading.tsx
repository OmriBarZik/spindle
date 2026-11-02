/** Holds the "This week" card's space while it loads, so the page doesn't jump. */
export function WeekStripLoading() {
  return <div aria-hidden className="card week-card" />;
}

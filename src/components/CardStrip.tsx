"use client";

import {
  Fragment,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { slotLabel } from "@/lib/timeline";

/** How close (px) to the strip's side edge a dragged card starts scrolling it. */
const EDGE = 56;
/** Scroll speed (px per frame) at the very edge. */
const SPEED = 14;

type Drag = { pointerId: number; dx: number; dy: number; x: number; y: number };

/**
 * The "Cards" layout: the line as a sideways, scrollable strip of big cards with a
 * gap between each. Today's song is a card under the strip that the player drags
 * into a gap (or they tap a gap). Dropping only chooses the gap; "Place it" (or a
 * second tap on the chosen gap) answers, so a slip of the finger costs nothing.
 *
 * The gaps are ordinary buttons, so keyboard and screen-reader players never need to drag.
 */
export default function CardStrip<T extends { year: number }>({
  cards,
  cardKey,
  renderCard,
  after,
  canPlace,
  selected,
  onSelect,
  onPlace,
  placeDisabled = false,
}: {
  cards: readonly T[];
  cardKey: (card: T) => string;
  renderCard: (card: T, index: number) => ReactNode;
  after?: ReactNode;
  canPlace: boolean;
  selected: number | null;
  onSelect: (slot: number) => void;
  onPlace?: (slot: number) => void;
  placeDisabled?: boolean;
}) {
  const { t } = useI18n();
  const stripRef = useRef<HTMLOListElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const frameRef = useRef(0);
  // Where the dragged card is drawn, and the gap it would drop into.
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  // Keep the chosen gap in view (it grows into a card-sized spot when chosen).
  useEffect(() => {
    if (selected === null) return;
    const gap = stripRef.current?.querySelector(`[data-slot="${selected}"]`);
    gap?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [selected]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  /** The gap nearest the pointer, or null when the pointer is far from the strip. */
  function gapAt(x: number, y: number): number | null {
    const strip = stripRef.current;
    if (!strip) return null;
    const box = strip.getBoundingClientRect();
    if (y < box.top - 120 || y > box.bottom + 120) return null;
    let best: number | null = null;
    let bestDistance = Infinity;
    for (const gap of strip.querySelectorAll<HTMLElement>("[data-slot]")) {
      const r = gap.getBoundingClientRect();
      // Only gaps the player can see.
      if (r.right < box.left || r.left > box.right) continue;
      const distance = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = Number(gap.dataset.slot);
      }
    }
    return best;
  }

  /** While dragging, scroll the strip when the card is held near its side. */
  function tick() {
    const drag = dragRef.current;
    const strip = stripRef.current;
    if (!drag || !strip) return;
    const box = strip.getBoundingClientRect();
    const nearTop = drag.y > box.top - 120 && drag.y < box.bottom + 120;
    if (nearTop) {
      if (drag.x < box.left + EDGE) strip.scrollBy(-SPEED * (1 - (drag.x - box.left) / EDGE), 0);
      else if (drag.x > box.right - EDGE)
        strip.scrollBy(SPEED * (1 - (box.right - drag.x) / EDGE), 0);
    }
    setHover(gapAt(drag.x, drag.y));
    frameRef.current = requestAnimationFrame(tick);
  }

  function startDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (!canPlace || placeDisabled || e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    try {
      // Keeps the moves coming even when the finger leaves the card.
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Not a live pointer (synthetic events): moves still reach the card.
    }
    dragRef.current = {
      pointerId: e.pointerId,
      dx: e.clientX - r.left,
      dy: e.clientY - r.top,
      x: e.clientX,
      y: e.clientY,
    };
    setGhost({ x: r.left, y: r.top });
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);
  }

  function moveDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    drag.x = e.clientX;
    drag.y = e.clientY;
    setGhost({ x: e.clientX - drag.dx, y: e.clientY - drag.dy });
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>, drop: boolean) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    cancelAnimationFrame(frameRef.current);
    const target = drop ? gapAt(e.clientX, e.clientY) : null;
    dragRef.current = null;
    setGhost(null);
    setHover(null);
    if (target !== null) onSelect(target);
  }

  const gap = (slot: number) => {
    if (!canPlace) return null;
    const label = slotLabel(cards, slot, t.slots);
    const chosen = selected === slot;
    const hovered = hover === slot;
    return (
      <li className="flex shrink-0 snap-center" data-slot={slot}>
        <button
          type="button"
          onClick={() => (chosen && onPlace ? onPlace(slot) : onSelect(slot))}
          disabled={chosen && placeDisabled}
          aria-pressed={chosen}
          aria-label={chosen ? t.common.placeIt(label) : t.common.addSlot(label)}
          className={`flex h-44 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-all duration-200 ${
            chosen
              ? "w-32 border-white bg-white/10 px-2 text-white"
              : hovered
                ? "w-14 border-white bg-white/15 text-white"
                : "w-10 border-line text-muted hover:border-white/50 hover:text-white"
          }`}
        >
          {chosen ? (
            <span aria-hidden className="flex flex-col items-center gap-2">
              <span className="mini-record h-10! w-10!" />
              <span className="text-center text-sm leading-tight font-semibold">{label}</span>
              <span className="text-xs text-muted">✓</span>
            </span>
          ) : (
            <span aria-hidden className="text-xl font-bold">
              +
            </span>
          )}
        </button>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <ol
        ref={stripRef}
        className="relative -mx-4 flex snap-x snap-proximity [scrollbar-width:thin] items-center gap-2 overflow-x-auto scroll-smooth px-4 py-2"
      >
        <li className="shrink-0 text-xs tracking-widest text-muted uppercase rtl:tracking-normal">
          {t.cards.oldest}
        </li>
        {cards.map((card, i) => (
          <Fragment key={cardKey(card)}>
            {gap(i)}
            {renderCard(card, i)}
          </Fragment>
        ))}
        {gap(cards.length)}
        {after}
        <li className="shrink-0 text-xs tracking-widest text-muted uppercase rtl:tracking-normal">
          {t.cards.newest}
        </li>
      </ol>

      {canPlace && (
        <div className="flex items-center gap-4">
          {/* Drag handle. Decorative for assistive tech: the gaps above are the buttons. */}
          <div
            aria-hidden
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={(e) => endDrag(e, true)}
            onPointerCancel={(e) => endDrag(e, false)}
            className={`mystery-card flex h-44 w-32 shrink-0 cursor-grab touch-none flex-col items-center justify-center gap-3 rounded-2xl select-none active:cursor-grabbing ${
              ghost || selected !== null ? "opacity-40" : ""
            } ${placeDisabled ? "pointer-events-none" : ""}`}
          >
            <span className="mini-record h-14! w-14!" />
            <span className="text-3xl font-black">?</span>
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-semibold">{t.cards.mystery}</p>
            <p className="text-sm text-muted">
              {selected === null ? t.cards.drag : t.cards.dragAgain}
            </p>
          </div>
        </div>
      )}

      {/* The card under the finger while dragging. */}
      {ghost && (
        <div
          aria-hidden
          className="mystery-card pointer-events-none fixed top-0 left-0 z-50 flex h-44 w-32 flex-col items-center justify-center gap-3 rounded-2xl shadow-2xl shadow-black/60"
          style={{ transform: `translate(${ghost.x}px, ${ghost.y}px) rotate(-4deg) scale(1.05)` }}
        >
          <span className="mini-record h-14! w-14!" />
          <span className="text-3xl font-black">?</span>
        </div>
      )}
    </div>
  );
}

import { clsx } from "clsx";
import { ModeLink } from "@/components/ModeLink";
import type { GameColor } from "@/components/ScreenMain";

/**
 * A game mode on the home page, drawn as a record sleeve with its record peeking out.
 * The record is the one that flies into the game when the sleeve is clicked.
 */
export function ModeSleeve({
  href,
  game,
  tag,
  name,
  desc,
}: {
  href: string;
  game: GameColor;
  tag: string;
  name: string;
  desc: string;
}) {
  return (
    <ModeLink href={href} className={clsx("sleeve", `sleeve-${game}`)}>
      <span className="sleeve-record record spin-slow" aria-hidden data-flight-record>
        <span className="record-label" />
      </span>
      <span className="sleeve-tag font-mono">{tag}</span>
      <span className="text-xl font-black">{name}</span>
      <span className="sleeve-desc text-sm">{desc}</span>
    </ModeLink>
  );
}

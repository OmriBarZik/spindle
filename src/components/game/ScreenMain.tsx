import { clsx } from "clsx";
import type { ReactNode } from "react";

/** A game mode, for its colours (`.game-*` in globals.css). */
export type GameColor = "daily" | "marathon" | "timeline";

/**
 * The page column of a game or settings screen. A game screen passes its `game` colour,
 * and on a desktop (`lg:`) it widens so the line uses the screen; its other parts stay
 * in the narrow column (`max-w-page`).
 */
export function ScreenMain({ game, children }: { game?: GameColor; children: ReactNode }) {
  return (
    <main
      className={clsx(
        "mx-auto flex w-full max-w-page flex-col gap-300 px-200 pb-800",
        game && `game-${game} lg:max-w-wide`,
      )}
    >
      {children}
    </main>
  );
}

import type { ReactNode } from "react";

/** The page column of a game or settings screen. */
export function ScreenMain({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16">{children}</main>;
}

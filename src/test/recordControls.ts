import { screen } from "@testing-library/react";
import { userEvent } from "vitest/browser";
import type { Locale } from "@/i18n/config";
import { MESSAGES } from "@/i18n/messages";

/** The gap the record is on, read from the line's overview bar. */
export function recordGap(container: HTMLElement): number {
  return [...container.querySelectorAll(".swipe-map-gap")].findIndex((g) =>
    g.classList.contains("swipe-map-on"),
  );
}

/** Moves the record to gap `slot` with the Earlier / Later buttons. */
export async function moveRecordTo(container: HTMLElement, slot: number, lang: Locale = "en") {
  const { earlier, later } = MESSAGES[lang].common;
  for (let step = 0; recordGap(container) !== slot; step++) {
    if (step > 50) {
      throw new Error(`The record never reached gap ${slot}`);
    }
    const name = recordGap(container) < slot ? later : earlier;
    // Each step depends on the one before.
    // oxlint-disable-next-line no-await-in-loop
    await userEvent.click(screen.getByRole("button", { name }));
  }
}

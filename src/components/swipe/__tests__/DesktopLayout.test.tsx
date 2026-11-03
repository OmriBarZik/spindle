import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { SortGame } from "@/components/sort/SortGame";
import { PITCH } from "@/hooks/swipe/useSwipePitch";
import { expectAccessible } from "@/test/expectAccessible";
import {
  gapUnderRecord,
  lineTrack,
  placeWithEnter,
  playSong,
  pointOn,
  recordGap,
  tapAt,
} from "@/test/input/recordControls";
import { renderIn } from "@/test/renderIn";
import { setupGameTests } from "@/test/setupGameTests";

setupGameTests();

/** A laptop-sized window for this test; the others stay at phone width. */
async function desktop(onTestFinished: (fn: () => Promise<void>) => void) {
  await page.viewport(1280, 800);
  onTestFinished(() => page.viewport(390, 844));
}

/** The distance between two neighbouring gaps, as laid out now. */
function gapPitch(container: HTMLElement) {
  const left = (gap: number) =>
    container.querySelector(`[data-gap="${gap}"]`)!.getBoundingClientRect().left;
  return left(1) - left(0);
}

it("widens the line on a desktop and keeps the buttons in a column", async ({ onTestFinished }) => {
  await desktop(onTestFinished);
  const { container } = renderIn("en", <SortGame />);
  // A gap plus a card at the desktop sizes (`--swipe-*` under `lg` in tokens.css).
  expect(gapPitch(container)).toBe(328);
  await playSong();
  const place = screen.getByRole("button", { name: /^Place it: / });
  expect(lineTrack(container).clientWidth).toBeGreaterThan(1.5 * place.clientWidth);
  await expectAccessible(container);
});

it("keeps the record on its gap with the bigger cards, and when the window resizes", async ({
  onTestFinished,
}) => {
  await desktop(onTestFinished);
  const { container } = renderIn("en", <SortGame />);
  await placeWithEnter(container, 2);
  const track = lineTrack(container);
  const pitch = gapPitch(container);
  await userEvent.keyboard("{Home}");
  await userEvent.keyboard("{ArrowRight}");
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 1, centred: true });

  // A click one gap to the left of the record, at the desktop's spacing.
  const [x, y] = pointOn(track, 0.5, 0.3);
  tapAt(track, [x - pitch, y], "mouse");
  await expect.poll(() => recordGap(container)).toBe(0);
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 0, centred: true });
  await userEvent.keyboard("{ArrowRight}");
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 1, centred: true });

  // Back to a phone: smaller cards, and the record stays on the same gap.
  await page.viewport(390, 844);
  await expect.poll(() => gapPitch(container)).toBe(PITCH);
  await expect.poll(() => gapUnderRecord(container)).toEqual({ gap: 1, centred: true });
  expect(recordGap(container)).toBe(1);
});

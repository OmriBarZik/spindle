import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { SortGame } from "@/components/sort/SortGame";
import { SwipeLine } from "@/components/swipe/SwipeLine";
import { PITCH } from "@/hooks/swipe/useSwipePitch";
import { SONGS } from "@/lib/catalog/songs";
import { createLiveSlot } from "@/lib/line/liveSlot";
import type { LineItem } from "@/lib/line/timeline";
import { expectAccessible } from "@/test/expectAccessible";
import { renderIn } from "@/test/renderIn";
import { setupGameTests } from "@/test/setupGameTests";

setupGameTests();

it("spaces its gaps as far apart as the code that scrolls it expects", () => {
  const { container } = renderIn("en", <SortGame />);
  const left = (gap: number) =>
    container.querySelector(`[data-gap="${gap}"]`)!.getBoundingClientRect().left;
  expect(left(1) - left(0)).toBe(PITCH);
});

/** Two songs from the same year, between the starting year and a later song. */
function sameYearLine(): LineItem[] {
  const [a, b] = SONGS.filter((s, _, all) => all.filter((o) => o.year === s.year).length > 1)
    .toSorted((x, y) => x.year - y.year)
    .slice(0, 2);
  const later = SONGS.find((s) => s.year > a!.year)!;
  return [
    { key: "anchor", year: a!.year - 5, song: null },
    { key: a!.id, year: a!.year, song: a! },
    { key: b!.id, year: b!.year, song: b! },
    { key: later.id, year: later.year, song: later },
  ];
}

it("stacks songs from the same year on one spot of the rail", async () => {
  const items = sameYearLine();
  const [, a, b] = items;
  const slots: number[] = [];
  const { container } = renderIn(
    "en",
    <SwipeLine items={items} slot={1} onSlot={(s) => slots.push(s)} live={createLiveSlot()} />,
  );
  // Three spots on the rail, one year each, and a gap only between stacks.
  expect(container.querySelectorAll("[data-item]")).toHaveLength(3);
  expect(container.querySelectorAll(".swipe-node")).toHaveLength(3);
  expect(container.querySelectorAll(".swipe-year")).toHaveLength(3);
  expect(container.querySelectorAll("[data-gap]")).toHaveLength(4);
  expect(container.querySelectorAll(".swipe-map-dot")).toHaveLength(3);
  // Both cards are in the stack; the one in front is the only one in reach.
  const stack = container.querySelector('[data-item="1"]')!;
  expect(stack.querySelectorAll(".swipe-card")).toHaveLength(2);
  const front = () => stack.querySelector(".swipe-stack-layer:not([inert])")!.textContent;
  expect(front()).toContain(b!.song!.title);
  await userEvent.click(
    screen.getByRole("button", { name: `2/2 from ${a!.year}: show the next song` }),
  );
  expect(front()).toContain(a!.song!.title);
  screen.getByRole("button", { name: `1/2 from ${a!.year}: show the next song` });
  await expectAccessible(container);

  // The game still hears card slots: past the stack is before the later song (slot 3).
  await userEvent.click(screen.getByRole("button", { name: "Later" }));
  await userEvent.keyboard("{End}");
  expect(slots).toEqual([3, 4]);
});

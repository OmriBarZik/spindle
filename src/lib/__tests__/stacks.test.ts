import { expect, it } from "vitest";
import { createLiveSlot } from "@/lib/liveSlot";
import {
  gapToSlot,
  slotToGap,
  stackedLive,
  stackFront,
  stackLine,
  stackOfCard,
  stackSizes,
} from "@/lib/stacks";

// 1990, then two songs from 1995, then 2000: three stacks, so four gaps.
const LINE = [{ year: 1990 }, { year: 1995 }, { year: 1995 }, { year: 2000 }];
const SIZES = stackSizes(LINE);

it("stackLine: puts neighbouring cards from the same year in one stack", () => {
  expect(stackLine(LINE)).toEqual([
    [{ year: 1990 }],
    [{ year: 1995 }, { year: 1995 }],
    [{ year: 2000 }],
  ]);
  expect(SIZES).toEqual([1, 2, 1]);
  expect(stackSizes([{ year: 1990 }, { year: 1991 }])).toEqual([1, 1]);
});

it.for([
  { name: "before the first", gap: 0, slot: 0 },
  { name: "before the stack", gap: 1, slot: 1 },
  { name: "after the stack", gap: 2, slot: 3 },
  { name: "the end", gap: 3, slot: 4 },
])("gapToSlot and slotToGap: $name", ({ gap, slot }) => {
  expect(gapToSlot(SIZES, gap)).toBe(slot);
  expect(slotToGap(SIZES, slot)).toBe(gap);
});

it("slotToGap: a slot inside a stack goes to the gap after it", () => {
  expect(slotToGap(SIZES, 2)).toBe(2);
});

it("stackOfCard and stackFront: find a card's stack and its place in it", () => {
  expect(LINE.map((_, i) => stackOfCard(SIZES, i))).toEqual([0, 1, 1, 2]);
  // The focused card shows first when it's in the stack, else the last card does.
  expect(stackFront(SIZES, 1, 1)).toBe(0);
  expect(stackFront(SIZES, 1, 2)).toBe(1);
  expect(stackFront(SIZES, 1, 0)).toBe(1);
});

it("stackedLive: reads and writes gaps on a store that keeps card slots", () => {
  const live = createLiveSlot();
  const gaps = stackedLive(live, SIZES);
  let heard = 0;
  const stop = gaps.subscribe(() => heard++);
  gaps.set(2);
  expect(live.get()).toBe(3);
  expect(gaps.get()).toBe(2);
  live.set(1);
  expect(gaps.get()).toBe(1);
  gaps.set(null);
  expect(live.get()).toBeNull();
  expect(heard).toBe(3);
  stop();
});

"use client";

import { clsx } from "clsx";
import { SwipeCardFace } from "@/components/SwipeCardFace";
import { SwipeRailSpot } from "@/components/SwipeRailSpot";
import type { LineItem } from "@/lib/timeline";

export function SwipeCard({ item, index, lit }: { item: LineItem; index: number; lit: boolean }) {
  return (
    <li className={clsx("swipe-item", lit && "swipe-lit")} data-item={index}>
      <SwipeCardFace item={item} />
      <SwipeRailSpot year={item.year} />
    </li>
  );
}

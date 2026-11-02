import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import SortGame from "@/components/SortGame";
import TimelineGame from "@/components/TimelineGame";
import { anchorYearFor } from "@/lib/daily";
import type { Design } from "@/lib/design";
import {
  expectAccessible,
  renderIn,
  savedData,
  setupGameTests,
  trackedEvents,
} from "@/test/helpers";

vi.mock("@/lib/youtube", async (original) =>
  (await import("@/test/helpers")).mockYoutube(original as never),
);
setupGameTests();

const DAY = "2026-11-01";

function pickDesign(design: Design) {
  window.localStorage.setItem("spindle:design", design);
}

describe("placement layouts", () => {
  it("compact: tapping the chosen gap again places the song", async () => {
    pickDesign("compact");
    const { container } = renderIn("en", <SortGame />);
    const year = anchorYearFor(DAY);
    // No separate "Place it" button: the gap itself turns into one.
    expect(screen.queryByRole("button", { name: /^Pick a spot/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: `+ Before ${year}` }));
    await userEvent.click(screen.getByRole("button", { name: `✓ Place it: Before ${year}` }));
    expect(savedData().sort.days[DAY]!.placements).toHaveLength(1);
    expect(trackedEvents().some(([name]) => name === "song_place")).toBe(true);
    fireEvent.animationEnd(container.querySelector(".deck-swap")!);
    await expectAccessible(container);
  });

  it("chips: tapping the chosen gap again places the song", async () => {
    pickDesign("chips");
    const { container } = renderIn("en", <TimelineGame />);
    const anchor = savedData().timeline.cards[0]!.year;
    await userEvent.click(screen.getByRole("button", { name: `+ After ${anchor}` }));
    // The "Place it" button under the line works too.
    expect(screen.getAllByRole("button", { name: `Place it: After ${anchor}` })).toHaveLength(2);
    await userEvent.click(screen.getAllByRole("button", { name: `Place it: After ${anchor}` })[0]!);
    expect(savedData().timeline.today!.result).not.toBe("pending");
    await expectAccessible(container);
  });

  it("dock: the record and the Place it button share the bottom bar", async () => {
    pickDesign("dock");
    const { container } = renderIn("en", <SortGame />);
    const bar = container.querySelector(".sticky")!;
    expect(bar.querySelector("[aria-label='Play']")).not.toBeNull();
    expect(bar.textContent).toContain("Pick a spot");
    await expectAccessible(container);
  });

  it("cards: dragging today's song onto a gap chooses it", async () => {
    pickDesign("cards");
    const { container } = renderIn("en", <SortGame />);
    const year = anchorYearFor(DAY);
    const handle = container.querySelector<HTMLElement>(".mystery-card")!;
    const gap = container.querySelector<HTMLElement>('[data-slot="1"]')!.getBoundingClientRect();
    const from = handle.getBoundingClientRect();
    const at = { clientX: gap.left + gap.width / 2, clientY: gap.top + gap.height / 2 };
    fireEvent.pointerDown(handle, {
      pointerId: 7,
      button: 0,
      clientX: from.left,
      clientY: from.top,
    });
    fireEvent.pointerMove(handle, { pointerId: 7, ...at });
    fireEvent.pointerUp(handle, { pointerId: 7, ...at });
    // Dropping only chooses the gap; nothing is placed until "Place it".
    expect(savedData().sort.days[DAY]!.placements).toHaveLength(0);
    const place = container.querySelector<HTMLButtonElement>(".btn-primary")!;
    expect(place.textContent).toBe(`Place it: After ${year}`);
    await userEvent.click(place);
    expect(savedData().sort.days[DAY]!.placements[0]!.slot).toBe(1);
    await expectAccessible(container);
  });

  it("cards: tapping a gap twice places without dragging", async () => {
    pickDesign("cards");
    const { container } = renderIn("en", <SortGame />);
    const year = anchorYearFor(DAY);
    await userEvent.click(screen.getByRole("button", { name: `+ Before ${year}` }));
    await userEvent.click(
      screen.getByRole("button", { name: `Place it: Before ${year}`, pressed: true }),
    );
    expect(savedData().sort.days[DAY]!.placements[0]!.slot).toBe(0);
    await expectAccessible(container);
  });

  it("the picker shows every layout and marks the current one", () => {
    pickDesign("chips");
    renderIn("he", <SortGame />);
    expect(screen.getByRole("button", { name: "שנים בשורה" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "קלאסית" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });
});

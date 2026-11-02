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

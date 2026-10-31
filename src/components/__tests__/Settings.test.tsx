// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Settings from "@/components/Settings";
import { expectAccessible, renderIn, savedData, setupGameTests } from "@/test/helpers";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
setupGameTests();

describe("Settings screen", () => {
  it("toggles song kinds but never turns off the last one", () => {
    renderIn("en", <Settings />);
    const intl = screen.getByRole("switch", { name: "International songs" });
    const israeli = screen.getByRole("switch", { name: "Israeli songs" });
    expect(intl.getAttribute("aria-checked")).toBe("true");
    expect(israeli.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(intl);
    expect(intl.getAttribute("aria-checked")).toBe("false");
    expect(israeli).toHaveProperty("disabled", true);
    expect(screen.getByRole("status").textContent).toBe("Keep at least one kind of song on.");
    expect(savedData().settings.songLanguages).toEqual(["he"]);

    fireEvent.click(intl);
    expect(savedData().settings.songLanguages).toEqual(["en", "he"]);
    expect(israeli).toHaveProperty("disabled", false);
  });

  it("links back to the games in the page's language", () => {
    renderIn("he", <Settings />);
    expect(screen.getByRole("link", { name: "חזרה למשחקים" }).getAttribute("href")).toBe("/he");
  });

  it("has no accessibility violations", async () => {
    const { container } = renderIn("en", <Settings />);
    await expectAccessible(container);
  });
});

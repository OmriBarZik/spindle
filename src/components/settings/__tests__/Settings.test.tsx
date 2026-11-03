import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { Settings } from "@/components/settings/Settings";
import { expectAccessible } from "@/test/expectAccessible";
import { renderIn } from "@/test/renderIn";
import { savedData } from "@/test/savedData";
import { setupGameTests } from "@/test/setupGameTests";

setupGameTests();

it("toggles song kinds but never turns off the last one", async () => {
  renderIn("en", <Settings />);
  const intl = screen.getByRole("switch", { name: "International songs" });
  const israeli = screen.getByRole("switch", { name: "Israeli songs" });
  expect(intl.getAttribute("aria-checked")).toBe("true");
  expect(israeli.getAttribute("aria-checked")).toBe("true");

  await userEvent.click(intl);
  expect(intl.getAttribute("aria-checked")).toBe("false");
  expect(israeli).toHaveProperty("disabled", true);
  expect(screen.getByRole("status").textContent).toBe("Keep at least one kind of song on.");
  expect(savedData().settings.songLanguages).toEqual(["he"]);

  await userEvent.click(intl);
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

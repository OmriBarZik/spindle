import { expect, it } from "vitest";
import { SortGame } from "@/components/SortGame";
import { PITCH } from "@/hooks/useSwipePitch";
import { renderIn } from "@/test/renderIn";
import { setupGameTests } from "@/test/setupGameTests";

setupGameTests();

it("spaces its gaps as far apart as the code that scrolls it expects", () => {
  const { container } = renderIn("en", <SortGame />);
  const left = (gap: number) =>
    container.querySelector(`[data-gap="${gap}"]`)!.getBoundingClientRect().left;
  expect(left(1) - left(0)).toBe(PITCH);
});

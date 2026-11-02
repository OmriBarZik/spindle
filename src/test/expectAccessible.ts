import axe from "axe-core";
import { expect } from "vitest";

/** Fails with a readable list if axe finds accessibility problems (with the real site CSS). */
export async function expectAccessible(container: HTMLElement) {
  const result = await axe.run(container, {
    runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
  });
  const problems = result.violations.map(
    (v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => n.html).join("\n  ")}`,
  );
  // The test viewport is phone width: the page must not scroll sideways (WCAG 1.4.10, reflow).
  const root = document.documentElement;
  if (root.scrollWidth > root.clientWidth) {
    problems.push("the page scrolls sideways");
  }
  expect(problems).toEqual([]);
}

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { isValidElement, type ReactNode } from "react";
import { expect, it, vi } from "vitest";
import * as Marathon from "@/app/[lang]/marathon/page";
import HomePage from "@/app/[lang]/page";
import * as Settings from "@/app/[lang]/settings/page";
import * as Sort from "@/app/[lang]/sort/page";
import { dirOf, type Locale, LOCALES } from "@/i18n/config";
import { I18nProvider } from "@/i18n/I18nProvider";
import { type Messages, MESSAGES } from "@/i18n/messages";
import { setupGameTests } from "@/test/setupGameTests";

// The page's language, which Next reads from the URL. `next/root-params` only exists inside
// a Next build, so this is the one module tests can't run for real.
const current = vi.hoisted(() => ({ lang: "en" as Locale }));
// oxlint-disable-next-line vitest/no-restricted-vi-methods -- see above
vi.mock("@/i18n/server", () => ({
  getI18n: () => Promise.resolve({ lang: current.lang, t: MESSAGES[current.lang] }),
}));
setupGameTests();

const PAGES = [
  { path: "/", page: { default: HomePage }, title: (t: Messages) => t.meta.title },
  { path: "/sort", page: Sort, title: (t: Messages) => t.meta.sortTitle },
  {
    path: "/marathon",
    page: Marathon,
    title: (t: Messages) => t.meta.marathonTitle,
  },
  {
    path: "/settings",
    page: Settings,
    title: (t: Messages) => t.meta.settingsTitle,
  },
];

/**
 * Runs the async Server Components in a tree (the browser can only render sync ones),
 * the way Next does on the server, so the page comes out as the HTML it would send.
 */
async function resolveServer(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) {
    return Promise.all(node.map(resolveServer));
  }
  if (!isValidElement<{ children?: ReactNode }>(node)) {
    return node;
  }
  const { type, props } = node;
  if (typeof type === "function" && type.constructor.name === "AsyncFunction") {
    return resolveServer(await (type as (p: object) => Promise<ReactNode>)(props));
  }
  if (props.children === undefined) {
    return node;
  }
  return { ...node, props: { ...props, children: await resolveServer(props.children) } };
}

/** What the root layout puts around a page: `<html lang dir>`, the title, and the body classes. */
async function renderPage(lang: Locale, Page: () => Promise<ReactNode>, title: string) {
  current.lang = lang;
  const root = document.documentElement;
  root.lang = lang;
  root.dir = dirOf(lang);
  document.title = title;
  document.body.className = "flex min-h-full flex-col";
  const ui = await resolveServer(await Page());
  return render(<I18nProvider lang={lang}>{ui}</I18nProvider>);
}

const CASES = LOCALES.flatMap((lang) =>
  PAGES.map(({ path, page, title }) => ({ name: `${lang}${path}`, lang, page, title })),
);

it.for(CASES)(
  "$name has no accessibility violations and does not scroll sideways",
  async ({ lang, page, title }) => {
    const t = MESSAGES[lang];
    await renderPage(lang, page.default, title(t));
    // The game screens load their code lazily and show a loading line until then.
    await waitFor(() => expect(screen.queryByText(t.common.loadingGame)).toBeNull());

    const result = await axe.run(document, {
      runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
    });
    const problems = result.violations.map(
      (v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => n.html).join("\n  ")}`,
    );
    const root = document.documentElement;
    if (root.scrollWidth > root.clientWidth) {
      problems.push("the page scrolls sideways");
    }
    expect(problems).toEqual([]);
    cleanup();
  },
);

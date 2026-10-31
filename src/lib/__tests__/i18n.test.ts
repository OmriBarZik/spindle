import { describe, expect, it } from "vitest";
import { localePath, matchAcceptLanguage, splitLocale } from "@/i18n/config";
import { MESSAGES } from "@/i18n/messages";
import { slotLabel } from "../timeline";

describe("i18n routing", () => {
  it("prefixes every language the same way", () => {
    expect(localePath("en", "/")).toBe("/en");
    expect(localePath("he", "/")).toBe("/he");
    expect(localePath("en", "/sort")).toBe("/en/sort");
    expect(localePath("he", "/timeline")).toBe("/he/timeline");
  });
  it("splits a language prefix off a path", () => {
    expect(splitLocale("/he/sort")).toEqual(["he", "/sort"]);
    expect(splitLocale("/en")).toEqual(["en", "/"]);
    expect(splitLocale("/sort")).toEqual([null, "/sort"]);
    expect(splitLocale("/hello")).toEqual([null, "/hello"]);
  });
  it("matches Accept-Language", () => {
    expect(matchAcceptLanguage("he-IL,he;q=0.9,en-US;q=0.8")).toBe("he");
    expect(matchAcceptLanguage("en-US,en;q=0.9,he;q=0.8")).toBe("en");
    expect(matchAcceptLanguage("fr-FR,iw;q=0.5")).toBe("he");
    expect(matchAcceptLanguage("fr-FR,de;q=0.5")).toBeNull();
    expect(matchAcceptLanguage("en;q=0.2,he;q=0.7")).toBe("he");
    expect(matchAcceptLanguage(null)).toBeNull();
  });
});

describe("messages", () => {
  it("has the same keys in every language", () => {
    const shape = (o: object): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        v && typeof v === "object" && !Array.isArray(v) && !("$$typeof" in v)
          ? shape(v).map((s) => `${k}.${s}`)
          : [k],
      );
    expect(shape(MESSAGES.he).sort()).toEqual(shape(MESSAGES.en).sort());
    expect(MESSAGES.he.home.rules.length).toBe(MESSAGES.en.home.rules.length);
  });
  it("labels slots in Hebrew", () => {
    const cards = [{ year: 1994 }, { year: 1997 }, { year: 2000 }];
    expect(slotLabel(cards, 0, MESSAGES.he.slots)).toBe("לפני 1994");
    expect(slotLabel(cards, 3, MESSAGES.he.slots)).toBe("אחרי 2000");
    expect(MESSAGES.he.common.songs(1)).toBe("שיר אחד");
    expect(MESSAGES.he.common.songs(3)).toBe("3 שירים");
  });
});

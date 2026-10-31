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
    const shape = (o: Record<string, unknown>): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        v && typeof v === "object" && !Array.isArray(v) && !("$$typeof" in v)
          ? shape(v as Record<string, unknown>).map((s) => `${k}.${s}`)
          : [k],
      );
    expect(shape(MESSAGES.he).toSorted()).toEqual(shape(MESSAGES.en).toSorted());
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

describe("song names", () => {
  it("shows Hebrew names on Hebrew pages and keeps English elsewhere", async () => {
    const { SONGS, songNames } = await import("../songs");
    const he = SONGS.find((s) => s.titleHe)!;
    expect(songNames(he, "he")).toEqual({ title: he.titleHe, artist: he.artistHe });
    expect(songNames(he, "en")).toEqual({ title: he.title, artist: he.artist });
    // Saved timeline cards only carry English names; lookup is by youtubeId.
    const saved = { title: he.title, artist: he.artist, youtubeId: he.youtubeId };
    expect(songNames(saved, "he").title).toBe(he.titleHe);
    const en = SONGS.find((s) => !s.titleHe)!;
    expect(songNames(en, "he")).toEqual({ title: en.title, artist: en.artist });
  });
  it("gives every Hebrew song both Hebrew names", async () => {
    const { SONGS } = await import("../songs");
    for (const s of SONGS) expect(Boolean(s.titleHe)).toBe(Boolean(s.artistHe));
    expect(SONGS.filter((s) => s.titleHe).length).toBeGreaterThanOrEqual(50);
  });
});

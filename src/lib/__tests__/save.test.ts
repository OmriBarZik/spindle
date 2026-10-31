import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emptySave, loadSave, writeSave } from "../storage";

const KEY = "spindle:v1";

/** A tiny in-memory localStorage for the node test environment. */
function fakeStorage(fail = false) {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (fail) throw new Error("QuotaExceededError");
      store.set(k, v);
    },
  };
}

let storage: ReturnType<typeof fakeStorage>;
beforeEach(() => {
  storage = fakeStorage();
  (globalThis as { window?: unknown }).window = { localStorage: storage };
});
afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe("loadSave", () => {
  it("starts fresh without a save", () => {
    expect(loadSave()).toEqual(emptySave());
  });

  it("starts fresh on broken JSON or an unknown version", () => {
    storage.store.set(KEY, "{nope");
    expect(loadSave()).toEqual(emptySave());
    storage.store.set(KEY, JSON.stringify({ version: 2 }));
    expect(loadSave()).toEqual(emptySave());
    storage.store.set(KEY, "null");
    expect(loadSave()).toEqual(emptySave());
  });

  it("round-trips a save", () => {
    const d = emptySave();
    d.timeline.best = 7;
    d.sort.stats.played = 3;
    writeSave(d);
    expect(loadSave()).toEqual(d);
  });

  it("fills in fields missing from older saves", () => {
    storage.store.set(
      KEY,
      JSON.stringify({ version: 1, sort: { stats: { played: 4 } }, timeline: { best: 2 } }),
    );
    const d = loadSave();
    expect(d.sort.days).toEqual({});
    expect(d.sort.stats).toEqual({ ...emptySave().sort.stats, played: 4 });
    expect(d.timeline).toEqual({ ...emptySave().timeline, best: 2 });
    expect(d.settings.songLanguages).toEqual(["en", "he"]);
  });

  it("cleans the song-language setting", () => {
    const save = (songLanguages: unknown) =>
      storage.store.set(KEY, JSON.stringify({ version: 1, settings: { songLanguages } }));
    save(["he", "fr", "en"]);
    expect(loadSave().settings.songLanguages).toEqual(["en", "he"]);
    save([]);
    expect(loadSave().settings.songLanguages).toEqual(["en", "he"]);
    save("he");
    expect(loadSave().settings.songLanguages).toEqual(["en", "he"]);
    save(["he"]);
    expect(loadSave().settings.songLanguages).toEqual(["he"]);
  });
});

describe("writeSave", () => {
  it("ignores storage errors", () => {
    storage = fakeStorage(true);
    (globalThis as { window?: unknown }).window = { localStorage: storage };
    expect(() => writeSave(emptySave())).not.toThrow();
  });
});

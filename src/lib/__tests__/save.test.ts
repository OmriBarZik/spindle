import { afterEach, beforeEach, expect, it } from "vitest";
import { emptySave, loadSave, writeSave } from "@/lib/storage";

const KEY = "spindle:v1";

type FakeStorage = {
  store: Map<string, string>;
  getItem: (k: string) => string | null;
  setItem: (k: string, v: string) => void;
};

/** A tiny in-memory localStorage for the node test environment. */
function fakeStorage(fail = false): FakeStorage {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (fail) {
        throw new Error("QuotaExceededError");
      }
      store.set(k, v);
    },
  };
}

let storage: FakeStorage;

beforeEach(() => {
  storage = fakeStorage();
  (globalThis as { window?: unknown }).window = { localStorage: storage };
});
afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

it("loadSave: starts fresh without a save", () => {
  expect(loadSave()).toEqual(emptySave());
});

it("loadSave: starts fresh on broken JSON or an unknown version", () => {
  storage.store.set(KEY, "{nope");
  expect(loadSave()).toEqual(emptySave());
  storage.store.set(KEY, JSON.stringify({ version: 2 }));
  expect(loadSave()).toEqual(emptySave());
  storage.store.set(KEY, "null");
  expect(loadSave()).toEqual(emptySave());
});

it("loadSave: round-trips a save", () => {
  const d = emptySave();
  d.timeline.best = 7;
  d.sort.stats.played = 3;
  writeSave(d);
  expect(loadSave()).toEqual(d);
});

it("loadSave: fills in fields missing from older saves", () => {
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

it("loadSave: cleans the song-language setting", () => {
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

it("writeSave: ignores storage errors", () => {
  storage = fakeStorage(true);
  (globalThis as { window?: unknown }).window = { localStorage: storage };
  expect(() => writeSave(emptySave())).not.toThrow();
});

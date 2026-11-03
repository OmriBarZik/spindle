import { type Locale, LOCALES } from "@/i18n/config";
import { SORT_SIZE } from "@/lib/catalog/daily";
import type {
  MarathonDay,
  MarathonFreeRun,
  MarathonStats,
  SaveData,
  SortDay,
  SortStats,
  TimelineState,
} from "./saveData";

const STORAGE_KEY = "spindle:v1";

export function emptySave(): SaveData {
  return {
    version: 1,
    sort: {
      days: {},
      stats: {
        played: 0,
        perfect: 0,
        streak: 0,
        maxStreak: 0,
        lastPerfect: null,
        distribution: Array.from({ length: SORT_SIZE + 1 }, () => 0),
      },
    },
    timeline: {
      cards: [],
      runStart: null,
      lastDate: null,
      runOver: false,
      best: 0,
      runs: 0,
      today: null,
    },
    marathon: { days: {}, stats: { played: 0, best: 0, totalHits: 0 } },
    settings: { songLanguages: [...LOCALES] },
  };
}

/** Keeps only known languages, in canonical order; falls back to all when empty. */
function cleanLanguages(value: unknown): Locale[] {
  const list: unknown[] = Array.isArray(value) ? value : [];
  const kept = LOCALES.filter((l) => list.includes(l));
  return kept.length > 0 ? kept : [...LOCALES];
}

/** What may be in storage: anything from an older version, or hand-edited junk. */
type StoredSave = {
  version?: unknown;
  sort?: { days?: Record<string, SortDay>; stats?: Partial<SortStats> };
  timeline?: Partial<TimelineState>;
  marathon?: {
    days?: Record<string, MarathonDay>;
    stats?: Partial<MarathonStats>;
    free?: MarathonFreeRun;
  };
  settings?: { songLanguages?: unknown };
} | null;

export function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptySave();
    }
    const parsed = JSON.parse(raw) as StoredSave;
    if (parsed?.version !== 1) {
      return emptySave();
    }
    const base = emptySave();
    return {
      ...base,
      ...parsed,
      version: 1,
      sort: {
        days: parsed.sort?.days ?? {},
        stats: { ...base.sort.stats, ...parsed.sort?.stats },
      },
      timeline: { ...base.timeline, ...parsed.timeline },
      marathon: {
        days: parsed.marathon?.days ?? {},
        stats: { ...base.marathon.stats, ...parsed.marathon?.stats },
        ...(parsed.marathon?.free ? { free: parsed.marathon.free } : {}),
      },
      settings: { songLanguages: cleanLanguages(parsed.settings?.songLanguages) },
    };
  } catch {
    return emptySave();
  }
}

export function writeSave(data: SaveData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Private mode / storage full: the game still works for this session.
  }
}

/** Turn a song language on or off. The last one left can't be turned off. */
export function setSongLanguage(data: SaveData, lang: Locale, on: boolean): SaveData {
  const current = data.settings.songLanguages;
  if (current.includes(lang) === on) {
    return data;
  }
  const next = on ? cleanLanguages([...current, lang]) : current.filter((l) => l !== lang);
  if (next.length === 0) {
    return data;
  }
  return { ...data, settings: { ...data.settings, songLanguages: next } };
}

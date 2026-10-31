"use client";

import { useCallback, useState } from "react";
import { loadSave, writeSave, type SaveData } from "./storage";

/**
 * Local save state. Only use inside components rendered with `ssr: false`,
 * because the initial value comes from localStorage.
 */
export function useSave(init?: (d: SaveData) => SaveData) {
  const [data, setData] = useState<SaveData>(() => {
    const loaded = loadSave();
    const ready = init ? init(loaded) : loaded;
    if (ready !== loaded) writeSave(ready);
    return ready;
  });

  const update = useCallback((fn: (d: SaveData) => SaveData) => {
    setData((prev) => {
      const next = fn(prev);
      if (next !== prev) writeSave(next);
      return next;
    });
  }, []);

  return [data, update] as const;
}

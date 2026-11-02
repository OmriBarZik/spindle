/**
 * The gap under the record, as the strip moves. While a finger drags the line,
 * this changes on every gap crossed; only the few small components that show it
 * (the place button, the overview bar) re-render, through `useSyncExternalStore`,
 * instead of the whole game. The game's own state catches up once the strip stops.
 */
export type LiveSlot = {
  get: () => number | null;
  set: (slot: number | null) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createLiveSlot(): LiveSlot {
  let value: number | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (slot) => {
      if (slot === value) return;
      value = slot;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

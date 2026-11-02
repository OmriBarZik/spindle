import type { SaveData } from "@/lib/saveData";

/** The save as the game wrote it. */
export function savedData(): SaveData {
  return JSON.parse(window.localStorage.getItem("spindle:v1") ?? "null") as SaveData;
}

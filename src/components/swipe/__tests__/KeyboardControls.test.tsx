import { fireEvent, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { KeyHints } from "@/components/game/KeyHints";
import { MarathonGame } from "@/components/marathon/MarathonGame";
import { SortGame } from "@/components/sort/SortGame";
import { TimelineGame } from "@/components/timeline/TimelineGame";
import type { Locale } from "@/i18n/config";
import { MESSAGES } from "@/i18n/messages";
import type { SaveData } from "@/lib/save/saveData";
import { trackedEvents } from "@/test/fakes/fakeAnalytics";
import { fakeYouTube } from "@/test/fakes/fakeYouTube";
import { lineTrack, placeWithEnter, playSong, recordGap } from "@/test/input/recordControls";
import { renderIn } from "@/test/renderIn";
import { savedData } from "@/test/savedData";
import { setupGameTests } from "@/test/setupGameTests";

// Arrow keys, Home and End are covered in SortGame.test.tsx.
setupGameTests();

const DAY = "2026-11-01";

function sortPlaced() {
  return savedData().sort.days[DAY]?.placements.length ?? 0;
}

const playButton = (name: "Play" | "Pause") => screen.queryByRole("button", { name });

/** Space does nothing until the player has loaded, as the play button is disabled till then. */
async function playerReady() {
  await expect.poll(() => playButton("Play")?.hasAttribute("disabled")).toBe(false);
}

it("plays and pauses with Space, with nothing focused", async () => {
  renderIn("en", <SortGame />);
  await playerReady();
  expect(playButton("Play")?.getAttribute("aria-keyshortcuts")).toBe("Space");
  await userEvent.keyboard(" ");
  expect(playButton("Pause")).not.toBeNull();
  expect(trackedEvents().map(([name]) => name)).toContain("song_play");
  await userEvent.keyboard(" ");
  expect(fakeYouTube.pauses).toBe(1);
  expect(playButton("Play")).not.toBeNull();
});

it("plays with Space while the line has the focus", async () => {
  const { container } = renderIn("en", <SortGame />);
  await playerReady();
  lineTrack(container).focus();
  await userEvent.keyboard(" ");
  expect(playButton("Pause")).not.toBeNull();
});

it("places with Enter, and not again while the answer shows", async () => {
  const { container } = renderIn("en", <SortGame />);
  await playerReady();
  // Not before the song has been played.
  await userEvent.keyboard("{Enter}");
  expect(sortPlaced()).toBe(0);
  await userEvent.keyboard(" ");
  const place = screen.getByRole("button", { name: /^Place it: / });
  expect(place.getAttribute("aria-keyshortcuts")).toBe("Enter");
  await userEvent.keyboard("{Enter}");
  expect(sortPlaced()).toBe(1);
  await userEvent.keyboard("{Enter}");
  expect(sortPlaced()).toBe(1);
  // Nor can Space play the next song before the record has swapped.
  await userEvent.keyboard(" ");
  expect(playButton("Pause")).toBeNull();
  fireEvent.animationEnd(container.querySelector(".deck-swap")!);
  await userEvent.keyboard(" ");
  await userEvent.keyboard("{Enter}");
  expect(sortPlaced()).toBe(2);
});

it("places at the gap the arrow keys chose", async () => {
  renderIn("en", <SortGame />);
  await playSong();
  await userEvent.keyboard("{Home}");
  await userEvent.keyboard("{Enter}");
  expect(savedData().sort.days[DAY]?.placements[0]?.slot).toBe(0);
});

it("leaves Enter and Space to a focused button", async () => {
  const { container } = renderIn("en", <SortGame />);
  await playerReady();
  await userEvent.keyboard("{End}");
  screen.getByRole("button", { name: "Earlier" }).focus();
  await userEvent.keyboard("{Enter}");
  expect(recordGap(container)).toBe(0);
  await userEvent.keyboard("{End}");
  screen.getByRole("button", { name: "Earlier" }).focus();
  await userEvent.keyboard(" ");
  expect(recordGap(container)).toBe(0);
  expect(sortPlaced()).toBe(0);
  expect(playButton("Pause")).toBeNull();
});

it.for([{ name: "Control" }, { name: "Shift" }, { name: "Alt" }, { name: "Meta" }])(
  "leaves $name with Enter or Space to the browser",
  async ({ name: key }) => {
    renderIn("en", <SortGame />);
    // Playing, so a plain Enter would place and a plain Space would pause.
    await playSong();
    await userEvent.keyboard(`{${key}>}{Enter}{/${key}}`);
    await userEvent.keyboard(`{${key}>} {/${key}}`);
    expect(sortPlaced()).toBe(0);
    expect(fakeYouTube.pauses).toBe(0);
  },
);

it("has no shortcuts once the day is done", async () => {
  const { container } = renderIn("en", <SortGame />);
  await placeWithEnter(container, 5);
  expect(sortPlaced()).toBe(5);
  await userEvent.keyboard(" ");
  await userEvent.keyboard("{Enter}");
  expect(sortPlaced()).toBe(5);
  expect(screen.queryByRole("button", { name: /^Place it: / })).toBeNull();
});

const GAMES: { name: string; ui: ReactElement; placed: (d: SaveData) => number }[] = [
  {
    name: "Marathon",
    ui: <MarathonGame />,
    placed: (d) => d.marathon.days[DAY]?.placements.length ?? 0,
  },
  {
    name: "Daily Timeline",
    ui: <TimelineGame />,
    placed: (d) => (d.timeline.today?.result === "pending" ? 0 : 1),
  },
];

it.for(GAMES)("plays with Space and places with Enter in $name", async ({ ui, placed }) => {
  renderIn("en", ui);
  await playerReady();
  await userEvent.keyboard(" ");
  expect(playButton("Pause")).not.toBeNull();
  await userEvent.keyboard("{Enter}");
  expect(placed(savedData())).toBe(1);
});

it.for<{ name: Locale }>([{ name: "en" }, { name: "he" }])(
  "lists the keys under the place button ($name)",
  ({ name }) => {
    const { container } = renderIn(name, <KeyHints />);
    const { keys } = MESSAGES[name].common;
    const hints = container.querySelector(".key-hints")!;
    for (const text of [keys.space, keys.enter, keys.move, keys.play, keys.place]) {
      expect(hints.textContent).toContain(text);
    }
    // Shown with a mouse or trackpad, as in this browser.
    expect(getComputedStyle(hints).display).toBe("flex");
  },
);

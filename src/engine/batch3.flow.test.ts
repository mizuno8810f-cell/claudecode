import { describe, expect, it } from "vitest";
import { GameEngine } from "./GameEngine";
import type { GameData } from "./types";
import gameJson from "../data/game.json";

function clone(): GameData {
  return JSON.parse(JSON.stringify(gameJson)) as GameData;
}
const stateOf = (e: GameEngine, id: string) => e.getSnapshot().objectStates[id]?.state;
const visibleOf = (e: GameEngine, id: string) => e.getSnapshot().objectStates[id]?.visible;
const inv = (e: GameEngine) => e.getSnapshot().inventory;
async function tap(e: GameEngine, id: string, n = 1) {
  for (let i = 0; i < n; i++) await e.touch(id);
}

describe("kitchen cupboard + 8-digit safe", () => {
  it("right half reveals the mug; touching it thanks the player; back re-closes it", async () => {
    const e = new GameEngine(clone());
    await e.touch("kitchen_cupboard");
    await e.touch("cupboard_right");
    expect(stateOf(e, "cupboard_right")).toBe("open");
    await e.touch("cupboard_mug");
    expect(e.getSnapshot().toast).toBe("お気に入りのマグカップをありがとう");
    await e.back();
    expect(stateOf(e, "cupboard_right")).toBe("closed");
  });

  it("left half + correct 8-digit code opens the safe and yields battery①", async () => {
    const e = new GameEngine(clone());
    await e.touch("kitchen_cupboard");
    await e.touch("cupboard_left");
    await e.touch("kitchen_safe");
    // answer 0 2 1 4 1 3 1 2 — dials start at 0, one tap advances by one
    const code = [0, 2, 1, 4, 1, 3, 1, 2];
    for (let i = 0; i < 8; i++) await tap(e, `safe8_dial_${i}`, code[i]);
    await e.touch("safe8_confirm");
    expect(stateOf(e, "kitchen_safe")).toBe("open");
    await e.touch("battery_1");
    expect(inv(e)).toContain("battery1");
    expect(visibleOf(e, "battery_1")).toBe(false);
  });

  it("a wrong code leaves the safe closed", async () => {
    const e = new GameEngine(clone());
    await e.touch("kitchen_cupboard");
    await e.touch("cupboard_left");
    await e.touch("kitchen_safe");
    await tap(e, "safe8_dial_0", 5); // wrong
    await e.touch("safe8_confirm");
    expect(stateOf(e, "kitchen_safe")).toBe("closed");
  });
});

describe("workspace shelf book ordering", () => {
  it("starts scrambled and yields the SD card only when 1..7 are in order", async () => {
    const e = new GameEngine(clone());
    await e.touch("workingspace_shelf");
    // slots do NOT start in order
    const ordered = () => [1, 2, 3, 4, 5, 6, 7].every((n) => stateOf(e, `book_slot_${n}`) === String(n));
    expect(ordered()).toBe(false);
    expect(inv(e)).not.toContain("sdcard");
    // cycle each slot to its correct number (tap advances 1->2->..->7->1)
    for (let n = 1; n <= 7; n++) {
      const cur = Number(stateOf(e, `book_slot_${n}`));
      const taps = (n - cur + 7) % 7;
      await tap(e, `book_slot_${n}`, taps);
    }
    expect(ordered()).toBe(true);
    expect(e.getSnapshot().toast).toBe("SDカードが落ちてきた");
    expect(inv(e)).toContain("sdcard");
  });
});

describe("bedroom window humidifier", () => {
  it("touching the humidifier activates it and fogs the window", async () => {
    const e = new GameEngine(clone());
    await e.touch("bedroom_window");
    expect(stateOf(e, "bedroom_window")).toBe("default");
    await e.touch("bedroom_humidifier");
    expect(stateOf(e, "bedroom_humidifier")).toBe("active");
    expect(stateOf(e, "bedroom_window")).toBe("cloudy");
  });
});

describe("PC SD-card gate", () => {
  // drive the password puzzle to the solved (sdnone) state
  async function solvePassword(e: GameEngine) {
    await tap(e, "workingspace_btn_hira", 7); // pw1 = ha
    await e.touch("workingspace_btn_enter");
    await tap(e, "workingspace_btn_hira", 2); // pw2 = ya
    await e.touch("workingspace_btn_enter");
    await tap(e, "workingspace_btn_hira", 4); // pw3 = to
    await e.touch("workingspace_btn_enter");
    await tap(e, "workingspace_btn_symbol", 2); // pw4 = skull
    await e.touch("workingspace_btn_enter");
  }
  // legitimately obtain the SD card from the shelf book puzzle
  async function getSdCard(e: GameEngine) {
    await e.touch("workingspace_shelf");
    for (let n = 1; n <= 7; n++) {
      const cur = Number(stateOf(e, `book_slot_${n}`));
      await tap(e, `book_slot_${n}`, (n - cur + 7) % 7);
    }
    await e.back();
  }

  it("without the SD card the PC complains; with it, the PC boots (morning)", async () => {
    const e = new GameEngine(clone());
    await solvePassword(e);
    expect(stateOf(e, "workingspace_pc")).toBe("sdnone");
    await e.touch("workingspace_pc");
    expect(e.getSnapshot().toast).toBe("sdカードがありません");
    expect(stateOf(e, "workingspace_pc")).toBe("sdnone");

    await getSdCard(e);
    expect(inv(e)).toContain("sdcard");
    await e.touch("workingspace_pc");
    expect(stateOf(e, "workingspace_pc")).toBe("active_morning");
    expect(inv(e)).not.toContain("sdcard"); // consumed
    await e.touch("workingspace_pc");
    expect(e.getSnapshot().toast).toBe("しおりちゃんのおかげで仕事頑張れてます。ありがとう！");
  });

  it("inserts as active_night when the window shows night", async () => {
    const g = clone();
    const curtain = g.stages[0].rooms.flatMap((r) => r.objects).find((o) => o.id === "workingspace_curtain")!;
    curtain.defaultState = "nightclose";
    const e = new GameEngine(g);
    await solvePassword(e);
    await getSdCard(e);
    await e.touch("workingspace_pc");
    expect(stateOf(e, "workingspace_pc")).toBe("active_night");
  });
});

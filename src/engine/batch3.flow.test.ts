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

// order the 7 movable books via 2-tap swaps (select a slot, tap another to swap)
async function sortBooks(e: GameEngine) {
  const bookAt = (k: number) => stateOf(e, `book_slot_${k}`);
  for (let p = 1; p <= 7; p++) {
    if (bookAt(p) === `book${p}`) continue;
    let s = -1;
    for (let k = 1; k <= 7; k++) if (bookAt(k) === `book${p}`) { s = k; break; }
    await e.touch(`book_slot_${p}`); // select slot p
    await e.touch(`book_slot_${s}`); // swap -> book p lands in slot p
  }
}

// the books are locked until the projector video plays; unlock them for these
// unit tests so the swap mechanic can be exercised directly.
function unlockedBooks(): GameData {
  const g = clone();
  for (let n = 1; n <= 7; n++)
    g.stages[0].rooms.flatMap((r) => r.objects).find((o) => o.id === `book_slot_${n}`)!.enabled = true;
  return g;
}

describe("workspace shelf book ordering (2-tap swap)", () => {
  it("books are locked until the projector video has played", async () => {
    const e = new GameEngine(clone());
    await e.touch("workingspace_shelf");
    const before = stateOf(e, "book_slot_1");
    await e.touch("book_slot_1"); // disabled -> no selection
    expect(stateOf(e, "book_slot_1")).toBe(before);
  });

  it("first tap selects, tapping another swaps the two books", async () => {
    const e = new GameEngine(unlockedBooks());
    await e.touch("workingspace_shelf");
    const a = stateOf(e, "book_slot_1");
    const b = stateOf(e, "book_slot_2");
    await e.touch("book_slot_1");
    expect(stateOf(e, "book_slot_1")).toBe(`${a}_sel`); // selected
    await e.touch("book_slot_2");
    expect(stateOf(e, "book_slot_1")).toBe(b); // swapped, deselected
    expect(stateOf(e, "book_slot_2")).toBe(a);
  });

  it("tapping the selected book again deselects it", async () => {
    const e = new GameEngine(unlockedBooks());
    const a = stateOf(e, "book_slot_3");
    await e.touch("book_slot_3");
    expect(stateOf(e, "book_slot_3")).toBe(`${a}_sel`);
    await e.touch("book_slot_3");
    expect(stateOf(e, "book_slot_3")).toBe(a);
  });

  it("ordering 1..7 makes a noise and reveals the present (no SD card)", async () => {
    const e = new GameEngine(unlockedBooks());
    const ordered = () => [1, 2, 3, 4, 5, 6, 7].every((n) => stateOf(e, `book_slot_${n}`) === `book${n}`);
    expect(ordered()).toBe(false);
    expect(visibleOf(e, "bedroom_present")).toBe(false);
    await sortBooks(e);
    expect(ordered()).toBe(true);
    expect(e.getSnapshot().toast).toBe("キッチンで物音がした");
    expect(visibleOf(e, "bedroom_present")).toBe(true);
    expect(inv(e)).not.toContain("sdcard");
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

describe("PC activation (password -> active)", () => {
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

  it("solving the password activates the PC directly (morning by default)", async () => {
    const e = new GameEngine(clone()); // bed default => morning
    await solvePassword(e);
    expect(stateOf(e, "workingspace_pc")).toBe("active_morning");
    await e.touch("workingspace_pc");
    expect(e.getSnapshot().toast).toBe("しおりちゃんのおかげで仕事頑張れてます。ありがとう！");
  });

  it("activates as active_night when the bed is left in the sleep state", async () => {
    const g = clone();
    g.stages[0].rooms.flatMap((r) => r.objects).find((o) => o.id === "bedroom_bed")!.defaultState = "sleep";
    const e = new GameEngine(g);
    await solvePassword(e);
    expect(stateOf(e, "workingspace_pc")).toBe("active_night");
  });
});

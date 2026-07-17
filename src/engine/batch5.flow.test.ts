import { describe, expect, it } from "vitest";
import { GameEngine } from "./GameEngine";
import type { GameData } from "./types";
import gameJson from "../data/game.json";

const clone = () => JSON.parse(JSON.stringify(gameJson)) as GameData;
const stateOf = (e: GameEngine, id: string) => e.getSnapshot().objectStates[id]?.state;
const visibleOf = (e: GameEngine, id: string) => e.getSnapshot().objectStates[id]?.visible;
const enabledOf = (e: GameEngine, id: string) => e.getSnapshot().objectStates[id]?.enabled;
const inv = (e: GameEngine) => e.getSnapshot().inventory;
async function tap(e: GameEngine, id: string, n = 1) { for (let i = 0; i < n; i++) await e.touch(id); }
async function orderBooks(e: GameEngine) {
  const at = (k: number) => stateOf(e, `book_slot_${k}`);
  for (let p = 1; p <= 7; p++) {
    if (at(p) === `book${p}`) continue;
    let s = -1;
    for (let k = 1; k <= 7; k++) if (at(k) === `book${p}`) { s = k; break; }
    await e.touch(`book_slot_${p}`); await e.touch(`book_slot_${s}`);
  }
}
// charge the remote, play + close the projector video (satisfies the shelf's
// "projector was on" gate). Requires the desk box to be unlocked first.
async function watchProjector(e: GameEngine) {
  await e.touch("battery_1");
  await e.touch("battery_2");
  await e.touch("livingroom_desk_box");
  e.pressInventoryItem("remote");
  e.pressInventoryItem("remote");
  await e.touch("remote_card_front");
  e.pressInventoryItem("battery1");
  await e.touch("remote_card_back0");
  e.pressInventoryItem("battery2");
  await e.touch("remote_card_back1");
  await e.back();
  e.pressInventoryItem("remote");
  await e.touch("projector");
  await e.back();
}

describe("batch5 fixes", () => {
  it("unlocking the workspace door consumes the key and clears the selection", async () => {
    const g = clone();
    g.stages[0].rooms.flatMap((r) => r.objects).find((o) => o.id === "ws_door_panel")!.defaultState = "closed";
    const e = new GameEngine(g);
    // seed the key legitimately: open the corner-rack safe and take key_a
    // (simpler: grant via the safe key object which is visible-touchable)
    await e.touch("safe_key_a");
    expect(inv(e)).toContain("key_a");
    e.pressInventoryItem("key_a");
    await e.touch("ws_door_panel");
    expect(stateOf(e, "ws_door_panel")).toBe("open");
    expect(inv(e)).not.toContain("key_a"); // removed
    expect(e.getSnapshot().selectedItemId).toBeNull(); // cleared
  });

  it("bedroom-rack phone shows a message without giving an item", async () => {
    const e = new GameEngine(clone());
    await e.touch("bedroom_rack");
    await e.touch("bedroom_smartphone");
    expect(e.getSnapshot().toast).toBe("いつも電話ありがとう");
    expect(inv(e).length).toBe(0);
  });

  it("the book puzzle can only be solved once (reveals present, then locks)", async () => {
    const g = clone();
    g.stages[0].rooms.flatMap((r) => r.objects).find((o) => o.id === "livingroom_desk_box")!.defaultState =
      "no_remote";
    const e = new GameEngine(g);
    await watchProjector(e); // satisfy the "projector was on" gate
    await e.touch("bedroom_bed"); // leave the bed in the sleep state first
    expect(stateOf(e, "bedroom_bed")).toBe("sleep");
    await e.touch("workingspace_shelf");
    await orderBooks(e);
    expect(e.getSnapshot().objectStates["bedroom_present"].visible).toBe(true);
    for (let n = 1; n <= 7; n++) expect(enabledOf(e, `book_slot_${n}`)).toBe(false); // locked after solving
    expect(inv(e)).not.toContain("sdcard"); // no SD card anymore
    // solving resets the bed to default and funnels the player to the present:
    expect(stateOf(e, "bedroom_bed")).toBe("default");
    // everything except the door-zoom + present objects is disabled...
    expect(enabledOf(e, "kitchen_fridge")).toBe(false);
    expect(enabledOf(e, "livingroom_sofa")).toBe(false);
    // ...while the present and the doors stay reachable
    expect(enabledOf(e, "bedroom_present")).toBe(true);
    expect(enabledOf(e, "ws_door_panel")).toBe(true);
    expect(enabledOf(e, "bedroom_door_panel")).toBe(true);
  });

  it("corner-rack mid shelf cannot be re-opened once the safe is open", async () => {
    const g = clone();
    g.stages[0].rooms.flatMap((r) => r.objects).find((o) => o.id === "corner_rack_safe")!.defaultState = "open";
    const e = new GameEngine(g);
    await e.touch("cr_shelf_mid");
    expect(e.getSnapshot().navigationStack).not.toContain("corner_rack_safe");
  });

  it("an active PC follows the bed: sleep -> night, wake -> morning", async () => {
    const g = clone();
    g.stages[0].rooms.flatMap((r) => r.objects).find((o) => o.id === "workingspace_pc")!.defaultState = "active_morning";
    const e = new GameEngine(g);
    await e.touch("bedroom_bed"); // default -> sleep
    expect(stateOf(e, "bedroom_bed")).toBe("sleep");
    expect(stateOf(e, "workingspace_pc")).toBe("active_night");
    expect(stateOf(e, "workingspace_curtain")).toContain("night"); // window follows too
    await e.touch("bedroom_bed"); // sleep -> default
    expect(stateOf(e, "workingspace_pc")).toBe("active_morning");
  });

  it("the bed coupling leaves an inactive PC untouched", async () => {
    const e = new GameEngine(clone());
    await e.touch("bedroom_bed"); // sleep
    expect(stateOf(e, "workingspace_pc")).toBe("inactive"); // 'inactive' contains 'active' — must not match
  });

  it("kitchen safe: solving pops back to the cupboard and reveals the battery", async () => {
    const e = new GameEngine(clone());
    expect(visibleOf(e, "battery_1")).toBe(false); // hidden at start
    await e.touch("kitchen_cupboard");
    await e.touch("cupboard_left");
    await e.touch("kitchen_safe");
    const code = [0, 2, 1, 4, 1, 3, 1, 2];
    for (let i = 0; i < 8; i++) await tap(e, `safe8_dial_${i}`, code[i]);
    await e.touch("safe8_confirm");
    expect(stateOf(e, "kitchen_safe")).toBe("open");
    expect(visibleOf(e, "battery_1")).toBe(true); // revealed
    // popped out of the safe zoom back to the cupboard-left zoom
    expect(e.getSnapshot().navigationStack[e.getSnapshot().navigationStack.length - 1]).toBe("cupboard_left");
    await e.touch("battery_1");
    expect(inv(e)).toContain("battery1");
  });
});

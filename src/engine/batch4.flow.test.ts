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
const toast = (e: GameEngine) => e.getSnapshot().toast;
const findObj = (g: GameData, id: string) => g.stages[0].rooms.flatMap((r) => r.objects).find((o) => o.id === id)!;
async function tap(e: GameEngine, id: string, n = 1) { for (let i = 0; i < n; i++) await e.touch(id); }

async function sortBooks(e: GameEngine) {
  const at = (k: number) => stateOf(e, `book_slot_${k}`);
  for (let p = 1; p <= 7; p++) {
    if (at(p) === `book${p}`) continue;
    let s = -1;
    for (let k = 1; k <= 7; k++) if (at(k) === `book${p}`) { s = k; break; }
    await e.touch(`book_slot_${p}`);
    await e.touch(`book_slot_${s}`);
  }
}
async function solvePassword(e: GameEngine) {
  await tap(e, "workingspace_btn_hira", 7); await e.touch("workingspace_btn_enter");
  await tap(e, "workingspace_btn_hira", 2); await e.touch("workingspace_btn_enter");
  await tap(e, "workingspace_btn_hira", 4); await e.touch("workingspace_btn_enter");
  await tap(e, "workingspace_btn_symbol", 2); await e.touch("workingspace_btn_enter");
}
async function getSdCard(e: GameEngine) {
  await e.touch("workingspace_shelf");
  await sortBooks(e);
  await e.back();
}

describe("sofa hint is gone once taken", () => {
  it("touching the cushion does not re-reveal the hint after pickup", async () => {
    const e = new GameEngine(clone());
    await e.touch("livingroom_sofa");
    await e.touch("livingroom_sofa_cushion");
    expect(visibleOf(e, "livingroom_sofa_hint")).toBe(true);
    await e.touch("livingroom_sofa_hint");
    expect(inv(e)).toContain("hint");
    expect(visibleOf(e, "livingroom_sofa_hint")).toBe(false);
    await e.back(); // onBack resets the cushion
    await e.touch("livingroom_sofa");
    await e.touch("livingroom_sofa_cushion");
    expect(visibleOf(e, "livingroom_sofa_hint")).toBe(false); // stays gone
  });
});

describe("cleaning robot", () => {
  const withDoorOpen = (g: GameData) => { findObj(g, "ws_door_panel").defaultState = "open"; };
  const withSafeOpen = (g: GameData) => { findObj(g, "kitchen_safe").defaultState = "open"; };

  it("starts charging on the floor and says so when tapped", async () => {
    const e = new GameEngine(clone());
    expect(stateOf(e, "cleaning_robot")).toBe("charging");
    await e.touch("cleaning_robot");
    expect(toast(e)).toBe("充電中…");
    expect(stateOf(e, "cleaning_robot")).toBe("charging"); // door still locked
  });

  it("unlocking the door charges it; tapping starts cleaning and hides it", async () => {
    const g = clone(); withDoorOpen(g);
    const e = new GameEngine(g);
    await e.touch("cleaning_robot"); // any action runs a watchState pass -> charge_complete
    expect(stateOf(e, "cleaning_robot")).toBe("charge_complete");
    await e.touch("cleaning_robot");
    expect(stateOf(e, "cleaning_robot")).toBe("cleaning");
    expect(visibleOf(e, "cleaning_robot")).toBe(false);
  });

  it("opening the safe finishes cleaning and yields battery②", async () => {
    const g = clone(); withDoorOpen(g); withSafeOpen(g);
    const e = new GameEngine(g);
    await e.touch("cleaning_robot"); // charging -> charge_complete
    await e.touch("cleaning_robot"); // charge_complete -> cleaning -> cleaning_done (safe open)
    expect(stateOf(e, "cleaning_robot")).toBe("cleaning_done");
    expect(visibleOf(e, "cleaning_robot")).toBe(true);
    await e.touch("cleaning_robot");
    expect(toast(e)).toBe("掃除が完了したみたい");
    await e.touch("battery_2");
    expect(inv(e)).toContain("battery2");
    expect(visibleOf(e, "battery_2")).toBe(false);
  });
});

describe("robot gates on the PC", () => {
  const withDoorOpen = (g: GameData) => { findObj(g, "ws_door_panel").defaultState = "open"; };

  it("unlocking the PC while the robot is charged nudges to clean first", async () => {
    const g = clone(); withDoorOpen(g);
    const e = new GameEngine(g);
    await e.touch("cleaning_robot"); // -> charge_complete
    await solvePassword(e); // PC -> sdnone; watchState nudges
    expect(toast(e)).toBe("そろそろ掃除しないと");
  });

  it("cannot insert the SD card while the robot is charged", async () => {
    const g = clone(); withDoorOpen(g);
    const e = new GameEngine(g);
    await e.touch("cleaning_robot"); // -> charge_complete
    await solvePassword(e);
    await getSdCard(e);
    await e.touch("workingspace_pc");
    expect(toast(e)).toBe("その前に掃除しないと");
    expect(stateOf(e, "workingspace_pc")).toBe("sdnone"); // not inserted
    expect(inv(e)).toContain("sdcard"); // still held
  });

  it("inserts fine once the robot has left the charged state", async () => {
    const g = clone(); withDoorOpen(g);
    const e = new GameEngine(g);
    await e.touch("cleaning_robot"); // charge_complete
    await e.touch("cleaning_robot"); // -> cleaning (no longer charge_complete)
    await solvePassword(e);
    await getSdCard(e);
    await e.touch("workingspace_pc");
    expect(stateOf(e, "workingspace_pc")).toBe("active_morning");
  });
});

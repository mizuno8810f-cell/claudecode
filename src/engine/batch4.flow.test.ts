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


import { describe, expect, it } from "vitest";
import { GameEngine } from "./GameEngine";
import type { GameData } from "./types";
import gameJson from "../data/game.json";

const clone = () => JSON.parse(JSON.stringify(gameJson)) as GameData;
const stateOf = (e: GameEngine, id: string) => e.getSnapshot().objectStates[id]?.state;
const toast = (e: GameEngine) => e.getSnapshot().toast;
const inv = (e: GameEngine) => e.getSnapshot().inventory;
const findObj = (g: GameData, id: string) =>
  g.stages[0].rooms.flatMap((r) => r.objects).find((o) => o.id === id)!;
async function tap(e: GameEngine, id: string, n = 1) { for (let i = 0; i < n; i++) await e.touch(id); }

describe("ver2 batch behaviors", () => {
  it("starts in the kitchen", () => {
    const e = new GameEngine(clone());
    expect(e.getSnapshot().roomId).toBe("room_kitchen");
  });

  it("the bedroom rack greets on first touch only", async () => {
    const e = new GameEngine(clone());
    await e.touch("bedroom_rack");
    expect(toast(e)).toBe("そろそろご飯とお掃除しないと");
    expect(stateOf(e, "ingredient_rice")).toBe("active"); // ingredients activated
    await e.back();
    e.dismissToast();
    await e.touch("bedroom_rack"); // second touch: no greeting
    expect(toast(e)).toBeNull();
  });

  it("cooking is blocked until the robot is cleaning", async () => {
    const g = clone();
    findObj(g, "ingredient_rice").defaultState = "active"; // skip the rack step
    const e = new GameEngine(g);
    await e.touch("ingredient_rice"); // get rice
    e.selectInventoryItem("rice");
    await e.touch("frying_pan"); // robot still charging
    expect(toast(e)).toBe("先にお掃除しなきゃ");
    expect(stateOf(e, "frying_pan")).toBe("empty"); // unchanged
  });

  it("cooking proceeds once the robot is cleaning", async () => {
    const g = clone();
    findObj(g, "ingredient_rice").defaultState = "active";
    findObj(g, "cleaning_robot").defaultState = "cleaning"; // robot already cleaning
    const e = new GameEngine(g);
    await e.touch("ingredient_rice");
    e.selectInventoryItem("rice");
    await e.touch("frying_pan");
    expect(stateOf(e, "frying_pan")).toBe("rice");
    expect(inv(e)).not.toContain("rice");
  });

  it("the robot announces when cleaning starts", async () => {
    const g = clone();
    findObj(g, "ws_door_panel").defaultState = "open"; // lets it finish charging
    const e = new GameEngine(g);
    await e.touch("cleaning_robot"); // charging -> charge_complete (watchState)
    await e.touch("cleaning_robot"); // charge_complete -> cleaning
    expect(toast(e)).toBe("掃除を開始しました");
    expect(stateOf(e, "cleaning_robot")).toBe("cleaning");
  });

  it("the aircon just complains about saving money", async () => {
    const e = new GameEngine(clone());
    await e.touch("workingspace_aircon");
    expect(toast(e)).toBe("節約、節約、、");
    expect(stateOf(e, "workingspace_aircon")).toBe("cold"); // no longer toggles
  });

  it("opening the corner-rack safe retires the hint card everywhere", async () => {
    const e = new GameEngine(clone());
    // reveal + take the hint from the sofa first
    await e.touch("livingroom_sofa");
    await e.touch("livingroom_sofa_cushion");
    await e.touch("livingroom_sofa_hint");
    expect(inv(e)).toContain("hint");
    // now solve the corner-rack safe (code 0 7 1 3)
    await e.touch("livingroom_corner_rack");
    await e.touch("cr_shelf_mid");
    const code = [0, 7, 1, 3];
    for (let i = 0; i < 4; i++) await tap(e, `safe_dial_${i}`, code[i]);
    await e.touch("safe_confirm");
    expect(stateOf(e, "corner_rack_safe")).toBe("open");
    expect(inv(e)).not.toContain("hint"); // removed from inventory
    // and it can no longer be re-revealed from the sofa
    await e.back();
    await e.touch("livingroom_sofa");
    await e.touch("livingroom_sofa_cushion");
    expect(e.getSnapshot().objectStates["livingroom_sofa_hint"].visible).toBe(false);
  });

  it("a wrong kitchen-safe confirm does not open it, and only counts once the prereqs are met", async () => {
    // Without PC-unlock + humidifier, a wrong confirm does not accrue a fail.
    const e = new GameEngine(clone());
    await e.touch("kitchen_cupboard");
    await e.touch("cupboard_left");
    await e.touch("kitchen_safe");
    await tap(e, "safe8_dial_0", 5); // wrong first dial
    await e.touch("safe8_confirm");
    expect(stateOf(e, "kitchen_safe")).toBe("closed");
    expect(e.getSnapshot().globalState.kitchenSafeFails).toBeUndefined();

    // With both prerequisites satisfied, wrong confirms start counting.
    const g = clone();
    findObj(g, "workingspace_pc").defaultState = "active_morning"; // PC unlocked
    findObj(g, "bedroom_humidifier").defaultState = "active"; // humidifier on
    const e2 = new GameEngine(g);
    await e2.touch("kitchen_cupboard");
    await e2.touch("cupboard_left");
    await e2.touch("kitchen_safe");
    await tap(e2, "safe8_dial_0", 5);
    await e2.touch("safe8_confirm");
    expect(e2.getSnapshot().globalState.kitchenSafeFails).toBe(1);
    expect(stateOf(e2, "kitchen_safe")).toBe("closed");
  });
});

import { describe, expect, it } from "vitest";
import { GameEngine } from "./GameEngine";
import type { GameData } from "./types";
import gameJson from "../data/game.json";

const clone = () => JSON.parse(JSON.stringify(gameJson)) as GameData;
const stateOf = (e: GameEngine, id: string) => e.getSnapshot().objectStates[id]?.state;
const inv = (e: GameEngine) => e.getSnapshot().inventory;
const nav = (e: GameEngine) => e.getSnapshot().navigationStack;
const navTop = (e: GameEngine) => nav(e)[nav(e).length - 1];
const findObj = (g: GameData, id: string) =>
  g.stages[0].rooms.flatMap((r) => r.objects).find((o) => o.id === id)!;
async function tap(e: GameEngine, id: string, n = 1) { for (let i = 0; i < n; i++) await e.touch(id); }

describe("desk-box lock puzzle", () => {
  it("starts locked and can only be zoomed (no remote yet)", async () => {
    const e = new GameEngine(clone());
    expect(stateOf(e, "livingroom_desk_box")).toBe("lock");
    await e.touch("livingroom_desk_box"); // zoom in, not a remote grab
    expect(navTop(e)).toBe("livingroom_desk_box");
    expect(inv(e)).not.toContain("remote");
    // the three buttons all start red
    for (let i = 1; i <= 3; i++) expect(stateOf(e, `box_btn_${i}`)).toBe("red");
  });

  it("buttons cycle red -> yellow -> blue -> red", async () => {
    const e = new GameEngine(clone());
    await e.touch("livingroom_desk_box");
    await e.touch("box_btn_1");
    expect(stateOf(e, "box_btn_1")).toBe("yellow");
    await e.touch("box_btn_1");
    expect(stateOf(e, "box_btn_1")).toBe("blue");
    await e.touch("box_btn_1");
    expect(stateOf(e, "box_btn_1")).toBe("red"); // wraps
  });

  it("red / blue / yellow unlocks the box, exits the zoom, and enables the remote", async () => {
    const e = new GameEngine(clone());
    await e.touch("livingroom_desk_box"); // zoom
    // target: btn1 red (leave), btn2 blue (2 taps), btn3 yellow (1 tap)
    await tap(e, "box_btn_2", 2);
    await tap(e, "box_btn_3", 1);
    expect(stateOf(e, "livingroom_desk_box")).toBe("no_remote");
    expect(nav(e)).not.toContain("livingroom_desk_box"); // popped out of the zoom
    // now it behaves like the old box: tap gives the remote, no more zoom
    await e.touch("livingroom_desk_box");
    expect(inv(e)).toContain("remote");
    expect(stateOf(e, "livingroom_desk_box")).toBe("has_remote");
  });
});

describe("kitchen-safe hint only after the prerequisites", () => {
  async function openSafeZoom(e: GameEngine) {
    await e.touch("kitchen_cupboard");
    await e.touch("cupboard_left");
    await e.touch("kitchen_safe");
  }
  const wrongConfirm = async (e: GameEngine) => {
    await tap(e, "safe8_dial_0", 5); // wrong
    await e.touch("safe8_confirm");
    await tap(e, "safe8_dial_0", 5); // reset dial back to 0 for the next attempt (10 total)
  };

  it("shows no hint before PC-unlock + humidifier, even after many fails", async () => {
    const e = new GameEngine(clone());
    await openSafeZoom(e);
    for (let i = 0; i < 4; i++) await wrongConfirm(e);
    expect(e.getSnapshot().globalState.kitchenSafeFails).toBeUndefined();
    expect(e.getSnapshot().toast).toBeNull();
  });

  it("shows a random hint on the 2nd failure once both prereqs are met", async () => {
    const g = clone();
    findObj(g, "workingspace_pc").defaultState = "active_morning";
    findObj(g, "bedroom_humidifier").defaultState = "active";
    const e = new GameEngine(g);
    await openSafeZoom(e);
    const hints = ["写真を撮ったのはいつだっけ…", "一回寝るか…", "奇妙な跡が…"];
    await wrongConfirm(e); // 1st failure: counts, but no hint yet
    expect(e.getSnapshot().globalState.kitchenSafeFails).toBe(1);
    e.dismissToast();
    await wrongConfirm(e); // 2nd failure: hint appears
    expect(e.getSnapshot().globalState.kitchenSafeFails).toBe(2);
    expect(hints).toContain(e.getSnapshot().toast);
  });
});

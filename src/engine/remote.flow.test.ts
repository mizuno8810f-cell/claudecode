import { describe, expect, it } from "vitest";
import { GameEngine } from "./GameEngine";
import type { GameData } from "./types";
import gameJson from "../data/game.json";

function clone(): GameData {
  const g = JSON.parse(JSON.stringify(gameJson)) as GameData;
  // These tests exercise the remote/battery flow, not the box lock puzzle, so
  // start the desk box already unlocked (skip straight to the remote-grant).
  g.stages[0].rooms
    .flatMap((r) => r.objects)
    .find((o) => o.id === "livingroom_desk_box")!.defaultState = "no_remote";
  return g;
}
const stateOf = (e: GameEngine, id: string) => e.getSnapshot().objectStates[id]?.state;
const inv = (e: GameEngine) => e.getSnapshot().inventory;
const navTop = (e: GameEngine) => {
  const s = e.getSnapshot().navigationStack;
  return s[s.length - 1];
};

// touch() bypasses the navigation gating, so items can be granted directly
async function grantItems(e: GameEngine) {
  await e.touch("battery_1"); // battery1
  await e.touch("battery_2"); // battery2
  await e.touch("livingroom_desk_box"); // remote
}
async function openInspect(e: GameEngine) {
  e.pressInventoryItem("remote"); // select
  e.pressInventoryItem("remote"); // re-tap opens remote_inspect
}

describe("remote / battery gimmick", () => {
  it("box gives the remote once, initial body state is battery_empty", async () => {
    const e = new GameEngine(clone());
    expect(stateOf(e, "livingroom_desk_box")).toBe("no_remote");
    await e.touch("livingroom_desk_box");
    expect(inv(e)).toContain("remote");
    expect(stateOf(e, "livingroom_desk_box")).toBe("has_remote");
    expect(stateOf(e, "remote_body")).toBe("battery_empty");
    // tapping the emptied box does nothing new
    const before = inv(e).filter((i) => i === "remote").length;
    await e.touch("livingroom_desk_box");
    expect(inv(e).filter((i) => i === "remote").length).toBe(before);
  });

  it("re-tapping the selected remote opens the zoom on the front face", async () => {
    const e = new GameEngine(clone());
    await grantItems(e);
    await openInspect(e);
    expect(navTop(e)).toBe("remote_inspect");
    expect(stateOf(e, "remote_inspect")).toBe("front");
  });

  it("flipping shows the back; the back matches the stored battery count", async () => {
    const e = new GameEngine(clone());
    await grantItems(e);
    await openInspect(e);
    await e.touch("remote_card_front"); // flip -> back (0 batteries)
    expect(stateOf(e, "remote_inspect")).toBe("back0");
    // no battery selected (remote is selected): tapping the back flips to front
    await e.touch("remote_card_back0");
    expect(stateOf(e, "remote_inspect")).toBe("front");
  });

  it("inserting two batteries fills the remote and syncs the body to has_battery", async () => {
    const e = new GameEngine(clone());
    await grantItems(e);
    await openInspect(e);
    await e.touch("remote_card_front"); // -> back0
    e.pressInventoryItem("battery1"); // select battery①
    await e.touch("remote_card_back0"); // insert #1
    expect(stateOf(e, "remote_inspect")).toBe("back1");
    expect(stateOf(e, "remote_body")).toBe("battery1");
    expect(inv(e)).not.toContain("battery1");

    e.pressInventoryItem("battery2"); // select battery②
    await e.touch("remote_card_back1"); // insert #2
    expect(stateOf(e, "remote_inspect")).toBe("back2");
    expect(stateOf(e, "remote_body")).toBe("battery_installed");
    expect(inv(e)).not.toContain("battery2");

    // full: tapping the back just flips to front, no further increase
    await e.touch("remote_card_back2");
    expect(stateOf(e, "remote_inspect")).toBe("front");
  });

  it("closing with back resets to front but the battery count persists", async () => {
    const e = new GameEngine(clone());
    await grantItems(e);
    await openInspect(e);
    await e.touch("remote_card_front");
    e.pressInventoryItem("battery1");
    await e.touch("remote_card_back0"); // 1 battery, now back1
    await e.back(); // close -> resets to front
    expect(stateOf(e, "remote_inspect")).toBe("front");
    expect(navTop(e)).toBeUndefined();
    // reopen: front, and flipping goes straight to the 1-battery back
    await openInspect(e);
    expect(stateOf(e, "remote_inspect")).toBe("front");
    await e.touch("remote_card_front");
    expect(stateOf(e, "remote_inspect")).toBe("back1");
  });
});

import { describe, expect, it } from "vitest";
import { GameEngine } from "./GameEngine";
import type { GameData } from "./types";
import gameJson from "../data/game.json";

function clone(): GameData {
  return JSON.parse(JSON.stringify(gameJson)) as GameData;
}
const stateOf = (e: GameEngine, id: string) => e.getSnapshot().objectStates[id]?.state;
const visibleOf = (e: GameEngine, id: string) => e.getSnapshot().objectStates[id]?.visible;
const enabledOf = (e: GameEngine, id: string) => e.getSnapshot().objectStates[id]?.enabled;
const global = (e: GameEngine, k: string) => e.getSnapshot().globalState[k];
const navTop = (e: GameEngine) => {
  const s = e.getSnapshot().navigationStack;
  return s[s.length - 1];
};

// obtain the remote and load both batteries so remote_body == battery_installed
async function chargeRemote(e: GameEngine) {
  await e.touch("battery_1");
  await e.touch("battery_2");
  await e.touch("livingroom_desk_box"); // remote
  e.pressInventoryItem("remote");
  e.pressInventoryItem("remote"); // open close-up
  await e.touch("remote_card_front"); // -> back0
  e.pressInventoryItem("battery1");
  await e.touch("remote_card_back0"); // insert #1
  e.pressInventoryItem("battery2");
  await e.touch("remote_card_back1"); // insert #2 -> battery_installed
  await e.back(); // close close-up
}

describe("corner rack now has two shelves", () => {
  it("dropped the bottom shelf and its figures", () => {
    const e = new GameEngine(clone());
    expect(e.getSnapshot().objectStates["cr_shelf_bottom"]).toBeUndefined();
    expect(e.getSnapshot().objectStates["cr_figure_1"]).toBeUndefined();
  });
});

describe("projector activation gating", () => {
  it("does nothing without the remote selected", async () => {
    const e = new GameEngine(clone());
    await e.touch("projector");
    expect(stateOf(e, "projector")).toBe("off");
    expect(e.getSnapshot().toast).toBe("リモコンで操作できそうだ");
  });

  it("does nothing with an uncharged remote", async () => {
    const e = new GameEngine(clone());
    await e.touch("livingroom_desk_box"); // remote, but battery_empty
    e.pressInventoryItem("remote");
    await e.touch("projector");
    expect(stateOf(e, "projector")).toBe("off");
    expect(e.getSnapshot().toast).toBe("リモコンの電池が足りないみたいだ");
  });

  it("charged remote turns it on and opens the confirm after the wait", async () => {
    const e = new GameEngine(clone());
    await chargeRemote(e);
    e.pressInventoryItem("remote");
    await e.touch("projector");
    expect(stateOf(e, "projector")).toBe("on");
    expect(navTop(e)).toBe("projector_confirm");
  });
});

describe("confirm outcomes", () => {
  it("いいえ closes the dialog and turns the projector back off", async () => {
    const e = new GameEngine(clone());
    await chargeRemote(e);
    e.pressInventoryItem("remote");
    await e.touch("projector");
    await e.touch("projector_confirm_no");
    expect(navTop(e)).toBeUndefined();
    expect(stateOf(e, "projector")).toBe("off");
    expect(global(e, "roomDarkMode")).not.toBe(true);
    expect(visibleOf(e, "bedroom_present")).toBe(false);
  });

  it("はい plays the video, unlocks the books, and leaves the room untouched", async () => {
    const e = new GameEngine(clone());
    // books start locked, no dark/light-up/disable/present side effects
    expect(enabledOf(e, "book_slot_1")).toBe(false);
    await chargeRemote(e);
    e.pressInventoryItem("remote");
    await e.touch("projector");
    await e.touch("projector_confirm_yes");

    expect(navTop(e)).toBe("projector_video");
    expect(global(e, "projectorEventActivated")).toBe(true);
    // the only game effect: the books become movable
    for (let n = 1; n <= 7; n++) expect(enabledOf(e, `book_slot_${n}`)).toBe(true);
    // no black-out, no light-up, no disabling, present still hidden
    expect(global(e, "roomDarkMode")).not.toBe(true);
    expect(stateOf(e, "workingspace_door")).not.toBe("light_up");
    expect(visibleOf(e, "bedroom_present")).toBe(false);
    expect(enabledOf(e, "livingroom_sofa")).toBe(true);
  });
});

describe("projector replay", () => {
  it("can be replayed; the confirm reopens and the video plays again", async () => {
    const e = new GameEngine(clone());
    await chargeRemote(e);
    e.pressInventoryItem("remote");
    await e.touch("projector");
    await e.touch("projector_confirm_yes"); // first play
    await e.back(); // close video
    await e.touch("projector"); // projector on -> confirm again (no remote needed)
    expect(navTop(e)).toBe("projector_confirm");
    await e.touch("projector_confirm_yes"); // replay
    expect(navTop(e)).toBe("projector_video");
    expect(global(e, "projectorEventActivated")).toBe(true);
  });
});

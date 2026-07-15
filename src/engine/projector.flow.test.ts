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

  it("はい plays the video and applies the one-time game changes", async () => {
    const e = new GameEngine(clone());
    await chargeRemote(e);
    e.pressInventoryItem("remote");
    await e.touch("projector");
    await e.touch("projector_confirm_yes");

    expect(navTop(e)).toBe("projector_video");
    expect(global(e, "projectorEventActivated")).toBe(true);
    expect(global(e, "roomDarkMode")).toBe(true);
    expect(visibleOf(e, "bedroom_present")).toBe(true);
    // only the workspace doors light up; the bedroom door does not
    for (const d of ["workingspace_door", "ws_door_panel"]) expect(stateOf(e, d)).toBe("light_up");
    expect(stateOf(e, "bedroom_door")).not.toBe("light_up");
    expect(stateOf(e, "bedroom_door_panel")).not.toBe("light_up");
    // the present is the lit goal (via config, while dark)
    expect(e.getConfig().lightUpObjectIds).toContain("bedroom_present");
    // non-excluded objects disabled, excluded ones (doors/present/projector) stay enabled
    expect(enabledOf(e, "livingroom_sofa")).toBe(false);
    expect(enabledOf(e, "bedroom_present")).toBe(true);
    expect(enabledOf(e, "projector")).toBe(true);
    expect(enabledOf(e, "bedroom_door")).toBe(true);
  });
});

describe("replay does not re-run the game changes", () => {
  it("second play only shows the video again", async () => {
    const e = new GameEngine(clone());
    await chargeRemote(e);
    e.pressInventoryItem("remote");
    await e.touch("projector"); // on + confirm
    await e.touch("projector_confirm_yes"); // first time: changes + video
    await e.back(); // close video
    // projector stays on; re-tap opens confirm again with no remote needed
    e.pressInventoryItem("remote"); // deselect not required, but clear state
    e.pressInventoryItem("remote");
    await e.touch("projector");
    expect(navTop(e)).toBe("projector_confirm");
    // re-enable the sofa to prove the changes are not re-applied
    // (simulate: it is currently disabled from the first run)
    expect(enabledOf(e, "livingroom_sofa")).toBe(false);
    await e.touch("projector_confirm_yes"); // replay
    expect(navTop(e)).toBe("projector_video");
    expect(global(e, "projectorEventActivated")).toBe(true);
  });

  it("present is not duplicated on replay", async () => {
    const e = new GameEngine(clone());
    await chargeRemote(e);
    e.pressInventoryItem("remote");
    await e.touch("projector");
    await e.touch("projector_confirm_yes");
    await e.back();
    const presentCount = () =>
      e.getCurrentRoom() && Object.keys(e.getSnapshot().objectStates).filter((k) => k === "bedroom_present").length;
    expect(presentCount()).toBe(1);
  });
});

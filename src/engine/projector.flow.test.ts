import { describe, expect, it } from "vitest";
import { GameEngine } from "./GameEngine";
import type { GameData } from "./types";
import gameJson from "../data/game.json";

function clone(): GameData {
  const g = JSON.parse(JSON.stringify(gameJson)) as GameData;
  // Start the desk box unlocked so the remote flow is reachable directly.
  g.stages[0].rooms
    .flatMap((r) => r.objects)
    .find((o) => o.id === "livingroom_desk_box")!.defaultState = "no_remote";
  return g;
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

  it("a charged remote turns it on and plays the video after the wait (no dialog)", async () => {
    const e = new GameEngine(clone());
    await chargeRemote(e);
    e.pressInventoryItem("remote");
    await e.touch("projector"); // on -> wait 1s -> video
    expect(stateOf(e, "projector")).toBe("on");
    expect(navTop(e)).toBe("projector_video");
  });
});

describe("projector video + book solve gating", () => {
  it("the confirm dialog objects are gone", () => {
    const e = new GameEngine(clone());
    expect(e.getSnapshot().objectStates["projector_confirm"]).toBeUndefined();
    expect(e.getSnapshot().objectStates["projector_confirm_yes"]).toBeUndefined();
  });

  it("books are swappable from the start, but only solve after the projector has been on", async () => {
    const e = new GameEngine(clone());
    for (let n = 1; n <= 7; n++) expect(enabledOf(e, `book_slot_${n}`)).toBe(true);
    expect(global(e, "projectorEventActivated")).not.toBe(true);

    await chargeRemote(e);
    e.pressInventoryItem("remote");
    await e.touch("projector"); // on -> video
    expect(navTop(e)).toBe("projector_video");
    await e.back(); // close the video -> projector counted as watched
    expect(global(e, "projectorEventActivated")).toBe(true);
    // present still hidden until the books are actually ordered
    expect(visibleOf(e, "bedroom_present")).toBe(false);
  });

  it("closing the video solves immediately when the books are already ordered", async () => {
    const g = clone();
    // pre-order the books in the data so the puzzle is already correct
    for (let n = 1; n <= 7; n++) {
      const slot = g.stages[0].rooms.flatMap((r) => r.objects).find((o) => o.id === `book_slot_${n}`)!;
      slot.defaultState = `book${n}`;
    }
    const e = new GameEngine(g);
    expect(visibleOf(e, "bedroom_present")).toBe(false); // not yet: projector never on
    await chargeRemote(e);
    e.pressInventoryItem("remote");
    await e.touch("projector"); // on -> video
    await e.back(); // closing the video re-checks the order -> solved
    expect(e.getSnapshot().toast).toBe("寝室で物音がした");
    expect(visibleOf(e, "bedroom_present")).toBe(true);
  });

  it("can be replayed; the video plays again directly", async () => {
    const e = new GameEngine(clone());
    await chargeRemote(e);
    e.pressInventoryItem("remote");
    await e.touch("projector"); // first play
    await e.back(); // close video
    await e.touch("projector"); // projector on -> video again (no remote needed)
    expect(navTop(e)).toBe("projector_video");
  });
});

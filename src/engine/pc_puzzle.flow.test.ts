import { describe, expect, it } from "vitest";
import { GameEngine } from "./GameEngine";
import type { GameData } from "./types";
import gameJson from "../data/game.json";

const PC = "workingspace_pc";
const HIRA = "workingspace_btn_hira";
const SYM = "workingspace_btn_symbol";
const ENTER = "workingspace_btn_enter";
const PWS = ["workingspace_pw1", "workingspace_pw2", "workingspace_pw3", "workingspace_pw4"];

function stateOf(e: GameEngine, id: string) {
  return e.getSnapshot().objectStates[id]?.state;
}
function visibleOf(e: GameEngine, id: string) {
  return e.getSnapshot().objectStates[id]?.visible;
}
function clone(): GameData {
  return JSON.parse(JSON.stringify(gameJson)) as GameData;
}
async function press(e: GameEngine, id: string, n = 1) {
  for (let i = 0; i < n; i++) await e.touch(id);
}
// enter the correct password: pw1=ha(hira7), pw2=ya(hira2), pw3=to(hira4), pw4=skull(sym2)
async function enterCorrect(e: GameEngine) {
  await press(e, HIRA, 7);
  await e.touch(ENTER);
  await press(e, HIRA, 2);
  await e.touch(ENTER);
  await press(e, HIRA, 4);
  await e.touch(ENTER);
  await press(e, SYM, 2);
  await e.touch(ENTER);
}

describe("workspace PC password puzzle", () => {
  it("starts with pw1 active_blank and the rest inactive_blank", () => {
    const e = new GameEngine(clone());
    expect(stateOf(e, PWS[0])).toBe("active_blank");
    expect(stateOf(e, PWS[1])).toBe("inactive_blank");
    expect(stateOf(e, PWS[2])).toBe("inactive_blank");
    expect(stateOf(e, PWS[3])).toBe("inactive_blank");
    expect(stateOf(e, PC)).toBe("inactive");
  });

  it("hiragana button cycles the active char", async () => {
    const e = new GameEngine(clone());
    await press(e, HIRA, 1);
    expect(stateOf(e, PWS[0])).toBe("active_a");
    await press(e, HIRA, 6); // a->ya->n->to->o->ta->ha
    expect(stateOf(e, PWS[0])).toBe("active_ha");
    await press(e, HIRA, 1); // ha->a (wraps)
    expect(stateOf(e, PWS[0])).toBe("active_a");
  });

  it("symbol button cycles the active char", async () => {
    const e = new GameEngine(clone());
    await press(e, SYM, 1);
    expect(stateOf(e, PWS[0])).toBe("active_smile");
    await press(e, SYM, 2); // smile->skull->apple
    expect(stateOf(e, PWS[0])).toBe("active_apple");
    await press(e, HIRA, 1); // any hiragana from a symbol -> a
    expect(stateOf(e, PWS[0])).toBe("active_a");
  });

  it("enter confirms current char and activates the next", async () => {
    const e = new GameEngine(clone());
    await press(e, HIRA, 7); // ha
    await e.touch(ENTER);
    expect(stateOf(e, PWS[0])).toBe("inactive_ha");
    expect(stateOf(e, PWS[1])).toBe("active_blank");
  });

  it("correct password turns the PC on to the SD-card-missing state and hides the chars", async () => {
    const e = new GameEngine(clone()); // curtain default = morningclose
    await enterCorrect(e);
    expect(stateOf(e, PC)).toBe("sdnone");
    for (const pw of PWS) expect(visibleOf(e, pw)).toBe(false);
  });

  it("wrong password resets the input", async () => {
    const e = new GameEngine(clone());
    // pw1=a, pw2=ya, pw3=to, pw4=skull  (first char wrong)
    await press(e, HIRA, 1);
    await e.touch(ENTER);
    await press(e, HIRA, 2);
    await e.touch(ENTER);
    await press(e, HIRA, 4);
    await e.touch(ENTER);
    await press(e, SYM, 2);
    await e.touch(ENTER);
    expect(stateOf(e, PC)).toBe("inactive");
    expect(stateOf(e, PWS[0])).toBe("active_blank");
    expect(stateOf(e, PWS[1])).toBe("inactive_blank");
    expect(stateOf(e, PWS[2])).toBe("inactive_blank");
    expect(stateOf(e, PWS[3])).toBe("inactive_blank");
  });

  it("buttons are inert once the PC is on, and touching it without the SD card complains", async () => {
    const e = new GameEngine(clone());
    await enterCorrect(e);
    expect(stateOf(e, PC)).toBe("sdnone");
    await press(e, HIRA, 3);
    await press(e, SYM, 3);
    await e.touch(ENTER);
    expect(stateOf(e, PC)).toBe("sdnone"); // unchanged
    await e.touch(PC);
    expect(e.getSnapshot().toast).toBe("sdカードがありません");
  });
});

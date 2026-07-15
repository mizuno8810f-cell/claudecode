import { describe, expect, it } from "vitest";
import { GameEngine } from "./GameEngine";
import type { GameData } from "./types";
import gameJson from "../data/game.json";

function clone(): GameData {
  const g = JSON.parse(JSON.stringify(gameJson)) as GameData;
  // the present is revealed by the projector event; reveal it directly for this test
  g.stages[0].rooms.flatMap((r) => r.objects).find((o) => o.id === "bedroom_present")!.visible = true;
  return g;
}
const stateOf = (e: GameEngine, id: string) => e.getSnapshot().objectStates[id]?.state;
const navTop = (e: GameEngine) => {
  const s = e.getSnapshot().navigationStack;
  return s[s.length - 1];
};
async function tap(e: GameEngine, id: string, n = 1) { for (let i = 0; i < n; i++) await e.touch(id); }

describe("present box combination puzzle", () => {
  it("each button cycles through 10 states and wraps around", async () => {
    const e = new GameEngine(clone());
    await e.touch("bedroom_present"); // zoom into the puzzle
    expect(stateOf(e, "present_dial_1")).toBe("0");
    await tap(e, "present_dial_1", 7);
    expect(stateOf(e, "present_dial_1")).toBe("7");
    await tap(e, "present_dial_1", 3); // 7->8->9->0
    expect(stateOf(e, "present_dial_1")).toBe("0");
  });

  it("a wrong combination keeps the box closed", async () => {
    const e = new GameEngine(clone());
    await e.touch("bedroom_present");
    await tap(e, "present_dial_1", 7);
    await tap(e, "present_dial_2", 5); // wrong (needs 3)
    await e.touch("present_ok");
    expect(stateOf(e, "bedroom_present")).toBe("closed");
    expect(e.getSnapshot().toast).toBe("違うみたいだ");
  });

  it("the correct combination opens the box; tapping it clears the game", async () => {
    const e = new GameEngine(clone());
    await e.touch("bedroom_present");
    await tap(e, "present_dial_1", 7);
    await tap(e, "present_dial_2", 3);
    await e.touch("present_ok");
    expect(stateOf(e, "bedroom_present")).toBe("open");
    expect(navTop(e)).toBeUndefined(); // popped back to the room
    expect(e.getSnapshot().cleared).toBe(false);
    // tapping the opened box clears the game
    await e.touch("bedroom_present");
    expect(e.getSnapshot().cleared).toBe(true);
  });

  it("game data configures a clear image", () => {
    const e = new GameEngine(clone());
    expect(e.getConfig().clearImage).toBe("images/clear.png");
  });
});

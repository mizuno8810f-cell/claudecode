import { describe, expect, it } from "vitest";
import { GameEngine } from "./GameEngine";
import type { GameData } from "./types";
import gameJson from "../data/game.json";

const clone = () => JSON.parse(JSON.stringify(gameJson)) as GameData;
const MESSAGES = ["👦お菓子食べ過ぎ", "👦太っちゃうよ？", "👩ダイエットは？"];

describe("snack box shows random messages forever", () => {
  it("every touch shows one of the messages and never goes silent", async () => {
    const e = new GameEngine(clone());
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      await e.touch("kitchen_snack_box");
      const t = e.getSnapshot().toast;
      expect(MESSAGES).toContain(t); // always reacts with a valid message
      if (t) seen.add(t);
      // state never changes, so it keeps reacting
      expect(e.getSnapshot().objectStates["kitchen_snack_box"].state).toBe("default");
    }
    // over many taps every message should appear (removes the old 3-then-silent)
    expect(seen).toEqual(new Set(MESSAGES));
  });

  it("no longer contains the old 内緒で食べよ line", () => {
    const box = clone().stages[0].rooms.flatMap((r) => r.objects).find((o) => o.id === "kitchen_snack_box")!;
    const json = JSON.stringify(box);
    expect(json).not.toContain("内緒で食べよ");
    expect(json).toContain("👩ダイエットは？");
    // single image across the (single) state
    expect(Object.keys(box.states)).toEqual(["default"]);
  });
});

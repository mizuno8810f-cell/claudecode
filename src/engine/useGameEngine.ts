import { useSyncExternalStore } from "react";
import type { GameEngine, EngineSnapshot } from "./GameEngine";

export function useGameSnapshot(engine: GameEngine): EngineSnapshot {
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
}

import { useMemo } from "react";
import { GameEngine, useGameSnapshot, type GameData } from "./engine";
import gameDataJson from "./data/game.json";
import { RoomStage } from "./components/RoomStage";
import { InventoryBar } from "./components/InventoryBar";
import { MessageOverlay } from "./components/MessageOverlay";
import { ImageOverlay } from "./components/ImageOverlay";
import { ClearScreen } from "./components/ClearScreen";

const gameData = gameDataJson as GameData;

export default function App() {
  const engine = useMemo(() => new GameEngine(gameData), []);
  const snapshot = useGameSnapshot(engine);

  return (
    <div className="app">
      {snapshot.cleared ? (
        <ClearScreen title={gameData.title} />
      ) : (
        <>
          <RoomStage engine={engine} snapshot={snapshot} />
          <InventoryBar engine={engine} snapshot={snapshot} />
          <MessageOverlay engine={engine} snapshot={snapshot} />
          <ImageOverlay engine={engine} snapshot={snapshot} />
        </>
      )}
    </div>
  );
}

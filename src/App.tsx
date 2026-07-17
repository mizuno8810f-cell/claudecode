import { useEffect, useMemo, useState } from "react";
import { GameEngine, useGameSnapshot, type GameData } from "./engine";
import gameDataJson from "./data/game.json";
import { RoomStage, ZOOM_BACKGROUND_IMAGES } from "./components/RoomStage";
import { InventoryBar } from "./components/InventoryBar";
import { Toast } from "./components/Toast";
import { ImageOverlay } from "./components/ImageOverlay";
import { ClearScreen } from "./components/ClearScreen";
import { TitleScreen } from "./components/TitleScreen";
import { preloadGameImages } from "./preload";

const gameData = gameDataJson as unknown as GameData;

export default function App() {
  // `started` gates the title screen; `runKey` forces a fresh engine when the
  // player returns to the title (a full restart).
  const [started, setStarted] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const engine = useMemo(() => new GameEngine(gameData), [runKey]);
  const snapshot = useGameSnapshot(engine);

  // Warm the image cache up-front so state swaps don't flash the broken "?".
  useEffect(() => {
    preloadGameImages(gameData, Object.values(ZOOM_BACKGROUND_IMAGES));
  }, []);

  // Dev-only handle so end-to-end tests can drive the engine directly.
  if (import.meta.env.DEV && typeof window !== "undefined") {
    (window as unknown as { __engine?: GameEngine }).__engine = engine;
  }

  const backToTitle = () => {
    setStarted(false);
    setRunKey((k) => k + 1); // discard the cleared engine; next start is fresh
  };

  if (!started) {
    return (
      <div className="app">
        <TitleScreen
          title={gameData.title}
          image={gameData.config?.titleImage}
          onStart={() => setStarted(true)}
        />
      </div>
    );
  }

  return (
    <div className="app">
      {snapshot.cleared ? (
        <ClearScreen image={gameData.config?.clearImage} onBackToTitle={backToTitle} />
      ) : (
        <>
          <RoomStage engine={engine} snapshot={snapshot} />
          <InventoryBar engine={engine} snapshot={snapshot} />
          <Toast engine={engine} snapshot={snapshot} />
          <ImageOverlay engine={engine} snapshot={snapshot} />
        </>
      )}
    </div>
  );
}

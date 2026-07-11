import type { GameEngine, EngineSnapshot } from "../engine";

interface MessageOverlayProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

export function MessageOverlay({ engine, snapshot }: MessageOverlayProps) {
  if (!snapshot.message) return null;

  return (
    <div className="overlay" onClick={() => engine.dismissMessage()}>
      <div className="overlay__message">
        <p>{snapshot.message}</p>
        <button type="button" onClick={() => engine.dismissMessage()}>
          OK
        </button>
      </div>
    </div>
  );
}

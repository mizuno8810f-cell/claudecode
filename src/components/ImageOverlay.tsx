import type { GameEngine, EngineSnapshot } from "../engine";

interface ImageOverlayProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

export function ImageOverlay({ engine, snapshot }: ImageOverlayProps) {
  if (!snapshot.image) return null;

  return (
    <div className="overlay" onClick={() => engine.dismissImage()}>
      <img className="overlay__image" src={snapshot.image} alt="" />
    </div>
  );
}

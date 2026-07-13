import type { GameEngine, EngineSnapshot } from "../engine";
import { assetUrl } from "../assets";

interface ImageOverlayProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

export function ImageOverlay({ engine, snapshot }: ImageOverlayProps) {
  if (!snapshot.image) return null;

  return (
    <div className="overlay" onClick={() => engine.dismissImage()}>
      <img className="overlay__image" src={assetUrl(snapshot.image)} alt="" />
    </div>
  );
}

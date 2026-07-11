import { useState } from "react";
import type { GameObject, ObjectRuntimeState } from "../engine";
import { ROOM_CANVAS_SIZE } from "../constants";

interface ObjectSpriteProps {
  def: GameObject;
  runtime: ObjectRuntimeState;
  image: string | undefined;
  onTouch: (objectId: string) => void;
}

export function ObjectSprite({ def, runtime, image, onTouch }: ObjectSpriteProps) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!runtime.visible) return null;

  const { x, y, width, height } = def.position;
  const pct = (value: number) => `${(value / ROOM_CANVAS_SIZE) * 100}%`;

  return (
    <button
      type="button"
      className={`object-sprite object-sprite--${def.type}${runtime.enabled ? "" : " object-sprite--disabled"}`}
      style={{ left: pct(x), top: pct(y), width: pct(width), height: pct(height) }}
      onClick={() => onTouch(def.id)}
      aria-label={def.name}
      data-object-id={def.id}
      data-object-state={runtime.state}
    >
      {image && !imageFailed ? (
        <img src={image} alt={def.name} draggable={false} onError={() => setImageFailed(true)} />
      ) : (
        <span className="object-sprite__fallback">{def.name}</span>
      )}
      {runtime.state !== def.defaultState && (
        <span className="object-sprite__state">{runtime.state}</span>
      )}
    </button>
  );
}

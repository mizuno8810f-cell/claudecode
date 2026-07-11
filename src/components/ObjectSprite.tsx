import { useState } from "react";
import type { GameObject, ObjectRuntimeState } from "../engine";

interface ObjectSpriteProps {
  def: GameObject;
  runtime: ObjectRuntimeState;
  onTouch: (objectId: string) => void;
}

export function ObjectSprite({ def, runtime, onTouch }: ObjectSpriteProps) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!runtime.visible) return null;

  const { x, y, width, height } = def.position;

  return (
    <button
      type="button"
      className={`object-sprite object-sprite--${def.type}${runtime.enabled ? "" : " object-sprite--disabled"}`}
      style={{ left: x, top: y, width, height }}
      onClick={() => onTouch(def.id)}
      aria-label={def.name}
      data-object-id={def.id}
      data-object-state={runtime.state}
    >
      {def.image && !imageFailed ? (
        <img
          src={def.image}
          alt={def.name}
          draggable={false}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="object-sprite__fallback">{def.name}</span>
      )}
      {runtime.state !== "default" && <span className="object-sprite__state">{runtime.state}</span>}
    </button>
  );
}

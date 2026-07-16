import { useState } from "react";
import type { GameObject, ObjectRuntimeState } from "../engine";
import { ROOM_CANVAS_SIZE } from "../constants";
import { assetUrl } from "../assets";

interface ObjectSpriteProps {
  def: GameObject;
  runtime: ObjectRuntimeState;
  image: string | undefined;
  /** 0 = off, 1 = layout info (pos/size), 2 = state info. */
  devMode?: number;
  /** Extra CSS class applied to the image itself (light-up / darken filter). */
  filterClass?: string;
  onTouch: (objectId: string) => void;
}

export function ObjectSprite({ def, runtime, image, devMode = 0, filterClass = "", onTouch }: ObjectSpriteProps) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!runtime.visible) return null;

  const { x, y, width, height } = def.position;
  const pct = (value: number) => `${(value / ROOM_CANVAS_SIZE) * 100}%`;
  // In dev modes (#1/#2) always show the placeholder box + info, even if the
  // object has an image, so boxes/coordinates stay visible.
  const showingImage = Boolean(image) && !imageFailed && devMode === 0;

  return (
    <button
      type="button"
      className={`object-sprite object-sprite--${def.type}${runtime.enabled ? "" : " object-sprite--disabled"}${showingImage ? " object-sprite--image" : ""}`}
      style={{ left: pct(x), top: pct(y), width: pct(width), height: pct(height) }}
      onClick={() => onTouch(def.id)}
      aria-label={def.name}
      data-object-id={def.id}
      data-object-state={runtime.state}
    >
      {showingImage ? (
        <img className={filterClass} src={assetUrl(image)} alt={def.name} draggable={false} onError={() => setImageFailed(true)} />
      ) : (
        <span className="object-sprite__fallback">
          {def.name}
          {devMode === 1 && (
            <span className="object-sprite__dev-state">
              #{def.id}
              <br />
              ({x},{y}) {width}×{height}
            </span>
          )}
          {devMode === 2 && (
            <span className="object-sprite__dev-state">
              #{def.id}
              <br />
              type: {def.type}
              <br />
              state: {runtime.state}
              {runtime.state !== def.defaultState ? ` (def:${def.defaultState})` : ""}
              <br />
              {runtime.enabled ? "enabled" : "disabled"}
            </span>
          )}
        </span>
      )}
      {devMode > 0 && runtime.state !== def.defaultState && (
        <span className="object-sprite__state">{runtime.state}</span>
      )}
    </button>
  );
}

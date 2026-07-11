import { useState } from "react";
import type { GameEngine, EngineSnapshot } from "../engine";
import { ObjectSprite } from "./ObjectSprite";
import { DevGrid } from "./DevGrid";

interface RoomStageProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

/**
 * Hand-authored placeholder background scenes for specific zoomed objects,
 * used until real art exists. Which object gets a custom scene (vs. the
 * generic zoom fallback) is decided per instructions, not automatically.
 */
const ZOOM_BACKGROUND_SCENES: Record<string, "sofa" | "plain" | "cornerRack"> = {
  livingroom_sofa: "sofa",
  livingroom_trash_can: "plain",
  livingroom_corner_rack: "cornerRack",
};

export function RoomStage({ engine, snapshot }: RoomStageProps) {
  const [bgFailed, setBgFailed] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const room = engine.getCurrentRoom();
  const background = engine.getBackgroundImage();
  const objects = engine.getDisplayedObjects();
  const isZoomed = snapshot.navigationStack.length > 0;
  const zoomTargetId = snapshot.navigationStack[snapshot.navigationStack.length - 1];
  const zoomScene = zoomTargetId ? ZOOM_BACKGROUND_SCENES[zoomTargetId] : undefined;

  if (!room) return null;

  return (
    <div className="room-stage">
      <div className="room-stage__header">
        {room.name}
        <button
          type="button"
          className={`room-stage__grid-toggle${showGrid ? " room-stage__grid-toggle--on" : ""}`}
          onClick={() => setShowGrid((v) => !v)}
          aria-label="座標グリッド表示切替（開発用）"
          title="座標グリッド（開発用）"
        >
          #
        </button>
      </div>
      <div className="room-stage__viewport">
        {background && !bgFailed ? (
          <img
            className="room-stage__background"
            src={background}
            alt={room.name}
            draggable={false}
            onError={() => setBgFailed(true)}
          />
        ) : zoomScene === "sofa" ? (
          <div className="room-stage__background sofa-scene">
            <div className="sofa-scene__carpet" />
            <div className="sofa-scene__desk-sliver" />
            <div className="sofa-scene__body">
              <div className="sofa-scene__armrest sofa-scene__armrest--left" />
              <div className="sofa-scene__armrest sofa-scene__armrest--right" />
              <div className="sofa-scene__backrest" />
            </div>
            <div className="sofa-scene__wall" />
          </div>
        ) : zoomScene === "plain" || zoomScene === "cornerRack" ? (
          <div className="room-stage__background room-stage__background--fallback" />
        ) : isZoomed ? (
          <div className="room-stage__background room-stage__background--zoom-fallback">
            <div className="room-stage__zoom-surface" />
          </div>
        ) : (
          <div className="room-stage__background room-stage__background--fallback" />
        )}

        {objects.map((obj) => {
          const runtime = snapshot.objectStates[obj.id];
          if (!runtime) return null;
          return (
            <ObjectSprite
              key={obj.id}
              def={obj}
              runtime={runtime}
              image={engine.getCurrentImage(obj.id)}
              onTouch={(id) => void engine.touch(id)}
            />
          );
        })}

        {zoomScene === "cornerRack" && <div className="corner-rack-scene__fold-line" />}

        {showGrid && <DevGrid />}

        {isZoomed && (
          <button
            type="button"
            className="room-stage__back"
            onClick={() => void engine.back()}
            disabled={snapshot.locked}
          >
            ← 戻る
          </button>
        )}
      </div>

      {!isZoomed && (
        <div className="room-stage__navbar">
          <button
            type="button"
            className="room-stage__navbar-btn"
            onClick={() => engine.moveRoom("left")}
            disabled={snapshot.locked || !room.leftRoomId}
            aria-label="左の部屋へ"
          >
            ‹
          </button>
          <button
            type="button"
            className="room-stage__navbar-btn"
            onClick={() => engine.moveRoom("right")}
            disabled={snapshot.locked || !room.rightRoomId}
            aria-label="右の部屋へ"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import type { GameEngine, EngineSnapshot } from "../engine";
import { ObjectSprite } from "./ObjectSprite";
import { DevGrid } from "./DevGrid";
import { ROOM_CANVAS_SIZE } from "../constants";

interface RoomStageProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

/**
 * Decorative vertical lines painted onto a room's background (behind objects),
 * keyed by room id. Values are x-coordinates in the 0..ROOM_CANVAS_SIZE space.
 */
const ROOM_BG_VLINES: Record<string, number[]> = {
  room_workingspace: [300],
  room_kitchen: [200, 300],
};

/**
 * Hand-authored placeholder background scenes for specific zoomed objects,
 * used until real art exists. Which object gets a custom scene (vs. the
 * generic zoom fallback) is decided per instructions, not automatically.
 */
const ZOOM_BACKGROUND_SCENES: Record<string, "sofa" | "plain" | "cornerRack" | "itemInspect"> = {
  livingroom_sofa: "sofa",
  livingroom_trash_can: "plain",
  livingroom_corner_rack: "cornerRack",
  corner_rack_safe: "plain",
  hint_inspect: "itemInspect",
  workingspace_door: "plain",
  bedroom_door: "plain",
  kitchen_trash_can: "plain",
  cr_shelf_bottom: "plain",
};

export function RoomStage({ engine, snapshot }: RoomStageProps) {
  const [bgFailed, setBgFailed] = useState(false);
  // Dev overlay mode: 0 = off, 1 = layout (id/pos/size), 2 = state.
  const [devMode, setDevMode] = useState(0);
  const room = engine.getCurrentRoom();
  const background = engine.getBackgroundImage();
  const objects = engine.getDisplayedObjects();
  const isZoomed = snapshot.navigationStack.length > 0;
  const zoomTargetId = snapshot.navigationStack[snapshot.navigationStack.length - 1];
  const zoomScene = zoomTargetId ? ZOOM_BACKGROUND_SCENES[zoomTargetId] : undefined;
  const isItemInspect = zoomScene === "itemInspect";

  if (!room) return null;

  const objectSprites = objects.map((obj) => {
    const runtime = snapshot.objectStates[obj.id];
    if (!runtime) return null;
    return (
      <ObjectSprite
        key={obj.id}
        def={obj}
        runtime={runtime}
        image={engine.getCurrentImage(obj.id)}
        devMode={devMode}
        onTouch={(id) => void engine.touch(id)}
      />
    );
  });

  return (
    <div className="room-stage">
      <div className="room-stage__header">
        {room.name}
        <button
          type="button"
          className={`room-stage__grid-toggle${devMode > 0 ? " room-stage__grid-toggle--on" : ""}`}
          onClick={() => setDevMode((m) => (m + 1) % 3)}
          aria-label="開発モード切替"
          title="開発モード: off → #1 レイアウト(座標/サイズ) → #2 状態(state/enabled)"
        >
          {devMode === 0 ? "#" : `#${devMode}`}
        </button>
      </div>
      <div className="room-stage__viewport">
        {isItemInspect ? (
          // Item close-up: a smaller floating window over a dimmed backdrop, so
          // it reads as a popup rather than a full-room zoom.
          <div className="item-inspect-backdrop">
            <div className="item-inspect-window">{objectSprites}</div>
          </div>
        ) : (
          <>
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

            {/* Room-level background decoration: vertical lines behind the objects. */}
            {!isZoomed &&
              (ROOM_BG_VLINES[room.id] ?? []).map((x) => (
                <div
                  key={x}
                  className="room-bg-vline"
                  style={{ left: `${(x / ROOM_CANVAS_SIZE) * 100}%` }}
                />
              ))}

            {objectSprites}

            {zoomScene === "cornerRack" && <div className="corner-rack-scene__fold-line" />}
          </>
        )}

        {devMode > 0 && <DevGrid />}

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

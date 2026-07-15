import { useState } from "react";
import type { GameEngine, EngineSnapshot } from "../engine";
import { ObjectSprite } from "./ObjectSprite";
import { DevGrid } from "./DevGrid";
import { ROOM_CANVAS_SIZE } from "../constants";
import { assetUrl } from "../assets";

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
/**
 * Dedicated full-screen background art for a zoomed-in object, keyed by the
 * zoom target's object id. When present this wins over the object's in-room
 * sprite image (which stays the small room icon) and over the placeholder
 * scenes below. Purely a rendering concern — no game logic here.
 *
 * A key may be `"<id>#<state>"` to give a specific state its own zoom art
 * (looked up before the plain `"<id>"` key); this lets a zoomed scene change
 * with the object's state (e.g. the bedroom window fogging up).
 */
const ZOOM_BACKGROUND_IMAGES: Record<string, string> = {
  workingspace_desk: "images/zoom_workingspace_desk.png",
  kitchen_fridge: "images/zoom_kitchen_fridge.png",
  kitchen_counter: "images/zoom_kitchen_counter.png",
  livingroom_desk: "images/zoom_livingroom_desk.png",
  livingroom_corner_rack: "images/zoom_livingroom_corner_rack.png",
  livingroom_sofa: "images/zoom_livingroom_sofa.png",
  kitchen_trash_can: "images/zoom_kitchen_trash_can.png",
  bedroom_rack: "images/zoom_bedroom_rack.png",
  bedroom_window: "images/zoom_bedroom_window.png",
  "bedroom_window#cloudy": "images/zoom_bedroom_window__cloudy.png",
  workingspace_shelf: "images/zoom_workingspace_shelf.png",
};

const ZOOM_BACKGROUND_SCENES: Record<string, "sofa" | "plain" | "cornerRack" | "itemInspect"> = {
  livingroom_sofa: "sofa",
  livingroom_trash_can: "plain",
  livingroom_corner_rack: "cornerRack",
  corner_rack_safe: "plain",
  hint_inspect: "itemInspect",
  remote_inspect: "itemInspect",
  workingspace_door: "plain",
  bedroom_door: "plain",
  kitchen_trash_can: "plain",
  cr_shelf_bottom: "plain",
  kitchen_fridge: "plain",
  kitchen_counter: "plain",
  omurice_inspect: "plain",
};

export function RoomStage({ engine, snapshot }: RoomStageProps) {
  // Track which background src failed to load so each distinct image (room or
  // zoom) gets its own fallback decision instead of one shared boolean.
  const [failedBg, setFailedBg] = useState<string | null>(null);
  // Dev overlay mode: 0 = off, 1 = layout (id/pos/size), 2 = state.
  const [devMode, setDevMode] = useState(0);
  const room = engine.getCurrentRoom();
  const objects = engine.getDisplayedObjects();
  const isZoomed = snapshot.navigationStack.length > 0;
  const zoomTargetId = snapshot.navigationStack[snapshot.navigationStack.length - 1];
  // A zoomed view only shows a background when a dedicated zoom photo is
  // registered (a state-specific `"<id>#<state>"` entry takes priority, so a
  // zoomed scene can change with state, e.g. the window fogging up). Without a
  // registered photo the zoom stays plain white — the object's small sprite
  // image is never stretched to fill the zoom. Rooms use their own background.
  const zoomTopState = zoomTargetId ? snapshot.objectStates[zoomTargetId]?.state : undefined;
  const zoomBgImage = zoomTargetId
    ? ZOOM_BACKGROUND_IMAGES[`${zoomTargetId}#${zoomTopState}`] ?? ZOOM_BACKGROUND_IMAGES[zoomTargetId]
    : undefined;
  const background = isZoomed ? zoomBgImage : engine.getBackgroundImage();
  const bgFailed = background != null && failedBg === background;
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
                src={assetUrl(background)}
                alt={room.name}
                draggable={false}
                onError={() => setFailedBg(background)}
              />
            ) : (
              // No background photo set (or it failed to load): plain white.
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

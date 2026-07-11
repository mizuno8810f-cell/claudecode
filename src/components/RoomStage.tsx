import { useState } from "react";
import type { GameEngine, EngineSnapshot } from "../engine";
import { ObjectSprite } from "./ObjectSprite";

interface RoomStageProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

export function RoomStage({ engine, snapshot }: RoomStageProps) {
  const [bgFailed, setBgFailed] = useState(false);
  const room = engine.getCurrentRoom();
  const background = engine.getBackgroundImage();
  const objects = engine.getDisplayedObjects();
  const isZoomed = snapshot.navigationStack.length > 0;

  if (!room) return null;

  return (
    <div className="room-stage">
      <div className="room-stage__header">{room.name}</div>
      <div className="room-stage__viewport">
        {background && !bgFailed ? (
          <img
            className="room-stage__background"
            src={background}
            alt={room.name}
            draggable={false}
            onError={() => setBgFailed(true)}
          />
        ) : (
          <div className="room-stage__background room-stage__background--fallback">
            <div className="room-stage__ceiling" />
            <div className="room-stage__wall" />
            <div className="room-stage__floor" />
          </div>
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

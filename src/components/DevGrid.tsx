import type { CSSProperties } from "react";
import { ROOM_CANVAS_SIZE } from "../constants";

/**
 * Development-only coordinate overlay. Draws grid lines every 100 units of the
 * virtual canvas (0..ROOM_CANVAS_SIZE, the same space object positions use) with
 * labels, so layout coordinates can be read straight off the screen. Toggled
 * from RoomStage's header button; the whole feature is self-contained here and
 * can be deleted in one file when no longer needed.
 */
const STEP = 100;
const VALUES = Array.from(
  { length: Math.floor(ROOM_CANVAS_SIZE / STEP) + 1 },
  (_, i) => i * STEP,
);

const pct = (v: number) => `${(v / ROOM_CANVAS_SIZE) * 100}%`;

function xLabelStyle(v: number): CSSProperties {
  if (v === 0) return { left: 2, top: 2 };
  if (v === ROOM_CANVAS_SIZE) return { right: 2, top: 2 };
  return { left: pct(v), top: 2, transform: "translateX(-50%)" };
}

function yLabelStyle(v: number): CSSProperties {
  if (v === 0) return { top: 14, left: 2 };
  if (v === ROOM_CANVAS_SIZE) return { bottom: 2, left: 2 };
  return { top: pct(v), left: 2, transform: "translateY(-50%)" };
}

export function DevGrid() {
  return (
    <div className="dev-grid" aria-hidden="true">
      {VALUES.map((v) => (
        <div key={`v${v}`} className="dev-grid__v" style={{ left: pct(v) }} />
      ))}
      {VALUES.map((v) => (
        <div key={`h${v}`} className="dev-grid__h" style={{ top: pct(v) }} />
      ))}
      {VALUES.map((v) => (
        <span key={`xl${v}`} className="dev-grid__label" style={xLabelStyle(v)}>
          {v}
        </span>
      ))}
      {VALUES.map((v) => (
        <span key={`yl${v}`} className="dev-grid__label" style={yLabelStyle(v)}>
          {v}
        </span>
      ))}
    </div>
  );
}

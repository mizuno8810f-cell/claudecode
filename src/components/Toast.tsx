import type { GameEngine, EngineSnapshot } from "../engine";

interface ToastProps {
  engine: GameEngine;
  snapshot: EngineSnapshot;
}

/** Transient notification pinned to the top of the screen; auto-dismisses. */
export function Toast({ engine, snapshot }: ToastProps) {
  if (!snapshot.toast) return null;

  return (
    <div className="toast" role="status" onClick={() => engine.dismissToast()}>
      {snapshot.toast}
    </div>
  );
}

import type { GameEngine } from "../engine";

interface ConfirmOverlayProps {
  engine: GameEngine;
  message: string;
  /** Object ids whose touch triggers carry the yes/no branch logic. */
  yesId: string;
  noId: string;
}

/**
 * Modal confirm dialog for the projector. Presentation only: the "はい"/"いいえ"
 * outcomes live as touch triggers on the yes/no game objects, so this just
 * forwards the click to the engine. Covers the viewport so the game behind it
 * is not interactive.
 */
export function ConfirmOverlay({ engine, message, yesId, noId }: ConfirmOverlayProps) {
  return (
    <div className="overlay-backdrop">
      <div className="confirm-dialog" role="dialog" aria-modal="true">
        <p className="confirm-dialog__message">
          {message.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              <br />
            </span>
          ))}
        </p>
        <div className="confirm-dialog__buttons">
          <button
            type="button"
            className="confirm-dialog__btn confirm-dialog__btn--yes"
            onClick={() => {
              // Use this real user gesture to go full-screen so the video that
              // opens next fills the screen (best-effort; ignored if blocked).
              try {
                void document.documentElement.requestFullscreen?.().catch(() => {});
              } catch {
                // fullscreen unavailable — the video still opens inline
              }
              void engine.touch(yesId);
            }}
          >
            はい
          </button>
          <button type="button" className="confirm-dialog__btn confirm-dialog__btn--no" onClick={() => void engine.touch(noId)}>
            いいえ
          </button>
        </div>
      </div>
    </div>
  );
}

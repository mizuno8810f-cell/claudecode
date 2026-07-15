import { useState } from "react";
import type { GameEngine } from "../engine";
import { assetUrl } from "../assets";

interface VideoOverlayProps {
  engine: GameEngine;
  /** Video path from game config; swap the file without touching code. */
  src: string | undefined;
}

/**
 * Modal video player for the projector demo. Presentation only — the one-time
 * game changes already happened on the "はい" trigger before this opened.
 * Autoplays from the start; the player may close it at any time (which just
 * pops the navigation), and the game changes stay applied.
 */
export function VideoOverlay({ engine, src }: VideoOverlayProps) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="overlay-backdrop">
      <div className="video-dialog">
        {src && !failed ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video className="video-dialog__player" src={assetUrl(src)} autoPlay controls playsInline onError={() => setFailed(true)} />
        ) : (
          <div className="video-dialog__placeholder">動画を再生できませんでした（{src ?? "未設定"}）</div>
        )}
        <button type="button" className="video-dialog__close" onClick={() => void engine.back()}>
          閉じる
        </button>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import type { GameEngine } from "../engine";
import { assetUrl } from "../assets";

interface VideoOverlayProps {
  engine: GameEngine;
  /** Video path from game config; swap the file without touching code. */
  src: string | undefined;
}

/** Best-effort request to show the video full-screen (ignored if disallowed). */
function goFullscreen(el: HTMLVideoElement | null) {
  if (!el) return;
  const anyEl = el as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
  try {
    if (el.requestFullscreen) void el.requestFullscreen().catch(() => {});
    else if (anyEl.webkitEnterFullscreen) anyEl.webkitEnterFullscreen(); // iOS Safari
  } catch {
    // fullscreen not available / blocked — the video still plays inline
  }
}

/**
 * Modal video player for the projector demo. Presentation only — the one-time
 * game changes already happened on the "はい" trigger before this opened.
 * Autoplays from the start and tries to go full-screen automatically; the
 * player may close it at any time, and the game changes stay applied.
 */
export function VideoOverlay({ engine, src }: VideoOverlayProps) {
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    goFullscreen(videoRef.current);
  }, []);

  return (
    <div className="overlay-backdrop">
      <div className="video-dialog">
        {src && !failed ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            ref={videoRef}
            className="video-dialog__player"
            src={assetUrl(src)}
            autoPlay
            controls
            onPlay={(e) => goFullscreen(e.currentTarget)}
            onError={() => setFailed(true)}
          />
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

import { useEffect, useRef, useState } from "react";
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
 *
 * The whole dialog (video + close button) fills the screen and requests
 * fullscreen on the CONTAINER, so the video looks full-screen while the 閉じる
 * button stays inside the fullscreen element and always reachable. The video
 * itself plays inline (not the native fullscreen player, which would hide the
 * button). Closing exits fullscreen first, then pops the navigation.
 */
export function VideoOverlay({ engine, src }: VideoOverlayProps) {
  const [failed, setFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el?.requestFullscreen) void el.requestFullscreen().catch(() => {});
  }, []);

  const close = () => {
    if (typeof document !== "undefined" && document.fullscreenElement && document.exitFullscreen) {
      void document.exitFullscreen().catch(() => {});
    }
    void engine.back();
  };

  return (
    <div className="overlay-backdrop">
      <div className="video-dialog" ref={containerRef}>
        <button type="button" className="video-dialog__close" onClick={close}>
          閉じる
        </button>
        {src && !failed ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            className="video-dialog__player"
            src={assetUrl(src)}
            autoPlay
            controls
            playsInline
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="video-dialog__placeholder">動画を再生できませんでした（{src ?? "未設定"}）</div>
        )}
      </div>
    </div>
  );
}

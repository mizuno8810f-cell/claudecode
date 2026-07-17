import { useState } from "react";
import { assetUrl } from "../assets";

interface TitleScreenProps {
  title: string;
  /** Optional full-screen background art (from game config). */
  image?: string;
  /** Called once the player has confirmed the intro dialog. */
  onStart: () => void;
}

/**
 * Pre-game title screen: the title, a はじめる button, and a one-off intro
 * dialog. The game itself does not begin until わかった！ is pressed.
 */
export function TitleScreen({ title, image, onStart }: TitleScreenProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(image) && !imageFailed;

  return (
    <div className="title-screen">
      {showImage && (
        <img
          className="title-screen__image"
          src={assetUrl(image as string)}
          alt=""
          draggable={false}
          onError={() => setImageFailed(true)}
        />
      )}
      <div className="title-screen__content">
        <h1 className="title-screen__title">{title}</h1>
        <button type="button" className="title-screen__start" onClick={() => setShowDialog(true)}>
          はじめる
        </button>
      </div>

      {showDialog && (
        <div className="title-dialog__backdrop">
          <div className="title-dialog">
            <p className="title-dialog__text">
              このゲームは水野作の完全オリジナルです
              <br />
              バグはご愛嬌でお願いします。
            </p>
            <button type="button" className="title-dialog__ok" onClick={onStart}>
              わかった！
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

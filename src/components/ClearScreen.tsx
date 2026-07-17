import { useState } from "react";
import { assetUrl } from "../assets";

interface ClearScreenProps {
  /** Optional full-screen image to fade into on clear (from game config). */
  image?: string;
  /** Return to the title screen (restarts the game). */
  onBackToTitle: () => void;
}

// The personal closing message shown on clear. Authored verbatim; rendered in
// a handwritten-style font over a soft background (kept light until real
// background art is supplied via config.clearImage).
const CLEAR_MESSAGE = `1年間ありがとう ！
毎日仕事に忙殺されてますが、しおりちゃんの存在が本当に励みになっていて感謝しかないです！
これから進展して環境が変わりそうなことに対して、しおりちゃんは不安5割、楽しみ5割って感じかな？
実際やってみたら「こんなもんか」ってなると思ってるし、そうなるようにお互いがお互いを思いやれる関係になれるといいね
ちなみに私は何も心配はなく、楽しみしかないです！

改めまして次の1年も引き続きよろしくお願いします！`;

export function ClearScreen({ image, onBackToTitle }: ClearScreenProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(image) && !imageFailed;

  return (
    <div className={`clear-screen${showImage ? " clear-screen--image" : ""}`}>
      {showImage && (
        <img
          className="clear-screen__image"
          src={assetUrl(image as string)}
          alt=""
          draggable={false}
          onError={() => setImageFailed(true)}
        />
      )}
      <div className="clear-screen__content">
        <p className="clear-screen__message">{CLEAR_MESSAGE}</p>
        <button type="button" className="clear-screen__back" onClick={onBackToTitle}>
          タイトルに戻る
        </button>
      </div>
    </div>
  );
}

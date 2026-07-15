import { useState } from "react";
import { assetUrl } from "../assets";

interface ClearScreenProps {
  title: string;
  /** Optional full-screen image to fade into on clear (from game config). */
  image?: string;
}

export function ClearScreen({ title, image }: ClearScreenProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(image) && !imageFailed;
  return (
    <div className="clear-screen">
      {showImage ? (
        <img
          className="clear-screen__image"
          src={assetUrl(image as string)}
          alt=""
          draggable={false}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <>
          <h1>GAME CLEAR</h1>
          <p>{title}</p>
        </>
      )}
    </div>
  );
}

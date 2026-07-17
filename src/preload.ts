import type { GameData } from "./engine";
import { assetUrl } from "./assets";

/**
 * Warm the browser cache with every image the game can show, so a state swap
 * paints the new art immediately instead of flashing the broken-image "?" for
 * a moment while the file downloads. Best-effort and fire-and-forget: it only
 * creates Image() objects, whose `src` assignment kicks off the fetch.
 */
export function preloadGameImages(game: GameData, extra: string[] = []): void {
  if (typeof Image === "undefined") return;
  const paths = new Set<string>();
  for (const stage of game.stages) {
    for (const room of stage.rooms) {
      if (room.background) paths.add(room.background);
      for (const obj of room.objects) {
        for (const state of Object.values(obj.states)) {
          if (state.image) paths.add(state.image);
        }
      }
    }
  }
  for (const item of game.items) if (item.image) paths.add(item.image);
  for (const p of extra) if (p) paths.add(p);
  for (const p of paths) {
    const url = assetUrl(p);
    if (!url) continue;
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}

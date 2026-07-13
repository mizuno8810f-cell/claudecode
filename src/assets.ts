/**
 * Resolve an asset path (e.g. "images/egg.png") against the app's base URL so
 * it works both locally and under the GitHub Pages base ("/claudecode/").
 * Absolute URLs, data URIs, and root-absolute paths are returned unchanged.
 */
export function assetUrl(path?: string): string | undefined {
  if (!path) return path ?? undefined;
  if (/^(?:[a-z]+:|\/\/|\/)/i.test(path)) return path;
  return import.meta.env.BASE_URL + path;
}

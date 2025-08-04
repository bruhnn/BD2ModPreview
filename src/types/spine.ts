export type SpineSource =
  | { type: "folder"; path: string }
  | { type: "url"; skeletonUrl: string; atlasUrl: string, skeletonUrlFallback?: string; atlasUrlFallback?: string };
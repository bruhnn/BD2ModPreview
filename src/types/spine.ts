export interface AnimationSequence {
  name: string;
  steps: { animation: string; delay: number; duration: number | null; loop?: boolean }[][];
}

export type SpineSource =
  | { type: "folder"; path: string }
  | { type: "url"; skeletonUrl: string; atlasUrl: string, skeletonUrlFallback?: string; atlasUrlFallback?: string };
export interface SpineAssetsData {
    modType?: string | null,
    modId?: string | null,
    skeletonFilename: string;
    atlasFilename: string;
    rawData?: Record<string, string>;
}

export interface SpinePlayer {
    dispose: () => void;
    play: () => void;
    pause: () => void;
    skeleton: any;
    sceneRenderer: any;
    config: any;
    bg: any;
    animationState: any;
    canvas: HTMLCanvasElement;
    setAnimation: (animation: string, loop: boolean) => void;
    addAnimation: () => void;
    draw: () => void;
}


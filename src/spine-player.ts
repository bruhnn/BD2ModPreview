import { invoke } from '@tauri-apps/api/core';
import { logMessage } from './logger';
import { showViewerError, showViewerSection } from './ui';

declare const spine: any;


interface SpineAssetData {
    skeleton_filename: string;
    atlas_filename: string;
    raw_data: Record<string, string>;
}

interface SpinePlayer {
    dispose: () => void;
    play: () => void;
    skeleton: any;
    sceneRenderer: any;
    config: any;
    bg: any;
    canvas: HTMLCanvasElement;
    draw: () => void;
}

export let playerInstance: SpinePlayer | null = null;
let userCamera: any | null = null;

export async function loadSpine(folderPath: string): Promise<void> {
    logMessage(`Attempting to load Spine assets from: ${folderPath}`);
    showViewerSection(true);

    try {
        const assetData = await invoke<SpineAssetData>("load_spine_assets_as_base64", { folderPath });

        if (!assetData || !assetData.skeleton_filename || !assetData.atlas_filename) {
            showViewerError("Error: Backend did not return valid spine asset data.");
            return;
        }

        logMessage("Successfully received asset data from backend.");
        logMessage(`Skeleton: ${assetData.skeleton_filename}`);
        logMessage(`Atlas: ${assetData.atlas_filename}`);

        const playerConfig = createPlayerConfig(assetData);
        initializePlayer(playerConfig);

    } catch (error) {
        showViewerError(`An error occurred while invoking backend: ${error}`);
    }
}

export async function setPlayerConfig(config: Partial<any>) {
    if (playerInstance && "premultipliedAlpha" in config) {
        logMessage("Changed premultipliedalpha!" + config.premultipliedAlpha)
        playerInstance.config.premultipliedAlpha = config.premultipliedAlpha
    }
    if (playerInstance && "backgroundColor" in config) {
         playerInstance.bg.setFromString(config.backgroundColor);             
         document.body.style.backgroundColor = config.backgroundColor;
    }
}

function createPlayerConfig(assetData: SpineAssetData): any {
    const backgroundColor = (document.getElementById("backgroundColor") as HTMLInputElement)?.value || "#111827";
    const premultipliedAlpha = (document.getElementById("premultipliedAlpha") as HTMLInputElement)?.checked || false;

    const config: any = {
        atlasUrl: assetData.atlas_filename,
        rawDataURIs: assetData.raw_data,
        backgroundColor: backgroundColor,
        premultipliedAlpha: premultipliedAlpha,
        showControls: true,
        alpha: true,
        showLoading: true,
        success: onPlayerSuccess,
        error: onPlayerError,
        update: onPlayerUpdate,
    };

    if (assetData.skeleton_filename.endsWith('.json')) {
        config.jsonUrl = assetData.skeleton_filename;
    } else if (assetData.skeleton_filename.endsWith('.skel')) {
        config.skelUrl = assetData.skeleton_filename;
    } else {
        showViewerError(`Unsupported skeleton file type: ${assetData.skeleton_filename}`);
    }
    
    return config;
}

function initializePlayer(config: any): void {
    const playerContainer = document.getElementById('player-container');
    if (!playerContainer) {
        showViewerError("Critical Error: 'player-container' element not found.");
        return;
    }

    if (playerInstance) {
        playerInstance.dispose();
        playerInstance = null;
    }

    playerContainer.innerHTML = '';

    logMessage("Initializing new SpinePlayer instance.");
    new spine.SpinePlayer("player-container", config);
}

function onPlayerSuccess(player: SpinePlayer): void {
    playerInstance = player;

    logMessage("Spine player loaded successfully.", "success");

    showViewerSection(true);

    const camera = player.sceneRenderer.camera;
    userCamera = new spine.OrthoCamera(camera.viewportWidth, camera.viewportHeight);
    userCamera.zoom = camera.zoom * 2;

    player.skeleton.setToSetupPose();
    player.skeleton.updateWorldTransform();
    const offset = new spine.Vector2();
    const size = new spine.Vector2();
    player.skeleton.getBounds(offset, size);
    userCamera.position.x = offset.x + size.x / 2;
    userCamera.position.y = offset.y + size.y / 2;

    new spine.CameraController(player.canvas, userCamera);
    player.play();
}

function onPlayerError(_player: SpinePlayer, message: string): void {
    showViewerError(message);
}

function onPlayerUpdate(): void {
    if (playerInstance && userCamera) {
        const playerCamera = playerInstance.sceneRenderer.camera;
        playerCamera.position.x = userCamera.position.x;
        playerCamera.position.y = userCamera.position.y;
        playerCamera.zoom = userCamera.zoom;
        playerCamera.update();
    }
}

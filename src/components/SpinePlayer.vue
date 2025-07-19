<script setup lang="ts">
import { onMounted, ref, useTemplateRef, watch, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useLogger } from '../logger';

const props = withDefaults(defineProps<{
    backgroundColor?: string,
    premultipliedAlpha?: boolean,
    backgroundImage?: string,
    loopAnimation?: boolean,
}>(), {
    backgroundColor: '#0F172A',
    premultipliedAlpha: false,
    backgroundImage: undefined,
    loopAnimation: true,
});

const emit = defineEmits<{
    success: [animationName: string]
    error: [error: SpineError]
    openLogs: []
    animationsLoaded: [animations: string[]]
}>();

const { logMessage } = useLogger();

const playerContainer = useTemplateRef("player-container");

const currentSkeletonUrl = ref<string | null>(null);
const currentAtlasUrl = ref<string | null>(null);
const currentSpineFolder = ref<string | null>(null);
const isPlayerInitialized = ref(false);
const currentAnimationName = ref<string | null>(null);

declare const spine: any;

interface SpineAssetData {
    skeleton_filename: string;
    atlas_filename: string;
    raw_data?: Record<string, string>;
}

interface SpinePlayer {
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

interface SpineError {
    type: string;
    title?: string;
    message: string;
    details?: string;
}

interface CameraState {
    x: number;
    y: number;
    zoom: number;
}

interface LoadSpineOptions {
    path?: string;
    skel_url?: string;
    atlas_url?: string;
}

let playerInstance: SpinePlayer | null = null;
let userCamera: any | null = null;


const defaultCameraState: CameraState = {
    x: 0,
    y: 0,
    zoom: 1
};

const CAMERA_RESET_KEY = 'f';

function createSpineError(type: string, message: string, details?: string): SpineError {
    return { type, message, details };
}

function handleInvokeError(error: any): void {
    const errorMap = {
        MissingSkeletonOrJson: "Could not find a .skel or .json file",
        DirectoryNotFound: "Directory not found"
    };

    if (typeof error === "object" && error.type) {
        const message = errorMap[error.type] || `An error occurred: ${error.type}`;
        const spineError = createSpineError(error.type, message, error.details);
        emit("error", spineError);
        logMessage(message, "error");
    } else {
        logMessage(`Unexpected error: ${error}`, 'error');
    }
}

async function loadSpineFromFolder(folderPath: string): Promise<void> {
    if (!folderPath) {
        logMessage("Invalid folder path provided", "error");
        return;
    }

    currentSpineFolder.value = folderPath;
    currentSkeletonUrl.value = null;
    currentAtlasUrl.value = null;

    logMessage(`Loading Spine assets from: ${folderPath}`);

    try {
        const assetData = await invoke<SpineAssetData>("get_spine_assets", { folderPath });

        if (!isValidAssetData(assetData)) {
            logMessage("Backend returned invalid spine asset data", "error");
            return;
        }

        // assetData.raw_data[assetData.atlas_filename] = decodeBase64Text(assetData.raw_data[assetData.atlas_filename])

        logMessage("Successfully received asset data from backend");
        logMessage(`Skeleton: ${assetData.skeleton_filename}`);
        logMessage(`Atlas: ${assetData.atlas_filename}`);

        const playerConfig = createPlayerConfig(assetData);
        await initializePlayer(playerConfig);
    } catch (error) {
        handleInvokeError(error);
    }
}

async function loadSpineFromUrls(skeletonUrl: string, atlasUrl: string): Promise<void> {
    if (!skeletonUrl || !atlasUrl) {
        logMessage("Invalid URLs provided", "error");
        return;
    }

    currentSkeletonUrl.value = skeletonUrl;
    currentAtlasUrl.value = atlasUrl;
    currentSpineFolder.value = null;

    const playerConfig = createPlayerConfig({
        skeleton_filename: skeletonUrl,
        atlas_filename: atlasUrl
    });

    await initializePlayer(playerConfig);
}

function isValidAssetData(assetData: SpineAssetData): boolean {
    return !!(assetData?.skeleton_filename && assetData?.atlas_filename);
}

// Player
function createPlayerConfig(assetData: SpineAssetData): any {
    const config: any = {
        atlasUrl: assetData.atlas_filename,
        showControls: true,
        alpha: true,
        showLoading: true,
        success: onPlayerSuccess,
        error: onPlayerError,
        update: onPlayerUpdate,
        premultipliedAlpha: props.premultipliedAlpha,
        backgroundColor: props.backgroundColor
    };

    if (props.backgroundImage) {
        config.backgroundImage = {
            url: props.backgroundImage
        };
    }

    if (assetData.skeleton_filename.endsWith('.json')) {
        config.jsonUrl = assetData.skeleton_filename;
    } else if (assetData.skeleton_filename.endsWith('.skel')) {
        config.skelUrl = assetData.skeleton_filename;
    } else {
        logMessage(`Unsupported skeleton file type: ${assetData.skeleton_filename}`, "error");
        return null;
    }

    // add raw data
    if (assetData.raw_data) {
        config.rawDataURIs = assetData.raw_data;
    }

    return config;
}

async function initializePlayer(config: any): Promise<void> {
    if (!playerContainer.value) {
        logMessage("Critical Error: 'player-container' element not found", "error");
        return;
    }

    if (!config) {
        logMessage("Invalid player configuration", "error");
        return;
    }

    await cleanupPlayer();

    playerContainer.value.innerText = '';
    logMessage("Initializing new SpinePlayer instance");

    new spine.SpinePlayer("player-container", config);
}

async function cleanupPlayer(): Promise<void> {
    if (playerInstance) {
        logMessage("Cleaning up the player.", "warn");

        try {
            playerInstance.dispose();
        } catch (error) {
            logMessage(`Error disposing player: ${error}`, "warn");
        }
        playerInstance = null;
        userCamera = null;
        isPlayerInitialized.value = false;
    }
}

//camera
function initializeCamera(player: SpinePlayer): void {
    const camera = player.sceneRenderer.camera;

    userCamera = new spine.OrthoCamera(camera.viewportWidth, camera.viewportHeight);
    userCamera.zoom = camera.zoom * 2;

    defaultCameraState.x = userCamera.position.x;
    defaultCameraState.y = userCamera.position.y;
    defaultCameraState.zoom = userCamera.zoom;

    new spine.CameraController(player.canvas, userCamera);
}

function resetCameraToDefault(): void {
    if (!playerInstance || !userCamera) {
        logMessage("Player or camera not initialized yet", "warn");
        return;
    }

    logMessage(`Resetting camera to: ${JSON.stringify(defaultCameraState)}`);

    userCamera.position.x = defaultCameraState.x;
    userCamera.position.y = defaultCameraState.y;
    userCamera.zoom = defaultCameraState.zoom;
}

function getAnimationNames(player: SpinePlayer): string[] {
    return player.skeleton.data.animations.map(anim => anim.name);
}

function findDefaultAnimation(animations: string[]): string | null {
    const lowerAnims = animations.map(name => name.toLowerCase());
    const allAnimationIndex = lowerAnims.indexOf("all");

    if (allAnimationIndex !== -1) {
        return animations[allAnimationIndex];
    }

    return animations.length > 0 ? animations[0] : null;
}

function setPlayerAnimation(animationName: string): void {
    if (!playerInstance) {
        logMessage("Cannot set animation: Player not initialized", "warn");
        return;
    }

    try {
        playerInstance.play();

        const trackEntry = playerInstance.animationState.setAnimation(0, animationName, props.loopAnimation);

        if (!props.loopAnimation) {
            trackEntry.listener = {
                complete: () => {
                    if (playerInstance) {
                        playerInstance.pause();
                        logMessage(`Animation '${animationName}' completed and player is now paused.`, "info");
                    }
                }
            };
        }

        logMessage(`Playing animation: ${animationName} (loop=${props.loopAnimation})`, "info");
        currentAnimationName.value = animationName
    } catch (error) {
        logMessage(`Error setting animation: ${error}`, "error");
    }
}

// Event handlers
function onPlayerSuccess(player: SpinePlayer): void {
    playerInstance = player;
    isPlayerInitialized.value = true;

    player.skeleton.setToSetupPose();
    player.skeleton.updateWorldTransform();

    initializeCamera(player);

    const animationNames = getAnimationNames(player);
    emit('animationsLoaded', animationNames);

    logMessage(`Animations found: ${animationNames.join(', ')}`, "info");

    player.play();

    const defaultAnimation = findDefaultAnimation(animationNames);

    if (defaultAnimation) {
        if (defaultAnimation.toLowerCase() === "all") {
            logMessage(`Animation named "${defaultAnimation}" found. Playing.`, "info");
        } else {
            logMessage("Playing the first animation.", "info");
        }
        setPlayerAnimation(defaultAnimation);
    }

    console.log(player.config)

    if (currentSpineFolder.value) {
        emit("success", {
            folderPath: currentSpineFolder.value,
            currentAnimation: defaultAnimation
        });
    } else if (currentSkeletonUrl.value) {
        // only folder for now
        // emit("success", {
        //     skeletonPath: currentSkeletonUrl.value,
        //     currentAnimation: defaultAnimation
        // });
    }
}

function onPlayerError(_player: SpinePlayer, message: string): void {
    const error = createSpineError("spineError", message, "Could not load the Spine animation.");
    emit("error", error);
    logMessage(`Spine player error: ${message}`, "error");
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

function handleKeydown(event: KeyboardEvent): void {
    if (event.key.toLowerCase() === CAMERA_RESET_KEY) {
        resetCameraToDefault();
    }
}

async function reloadCurrentSpine(): Promise<void> {
    if (currentSpineFolder.value) {
        await loadSpineFromFolder(currentSpineFolder.value);
    } else if (currentSkeletonUrl.value && currentAtlasUrl.value) {
        await loadSpineFromUrls(currentSkeletonUrl.value, currentAtlasUrl.value);
    }
}

defineExpose({
    loadSpine: async (source: LoadSpineOptions) => {
        if (source.path) {
            await loadSpineFromFolder(source.path);
        } else if (source.skel_url && source.atlas_url) {
            await loadSpineFromUrls(source.skel_url, source.atlas_url);
        } else {
            logMessage("Invalid spine source provided", "error");
        }
    },
    playAnimation: (animationName: string) => {
        if (!animationName) {
            logMessage("Animation name is required", "warn");
            return;
        }
        setPlayerAnimation(animationName);
    },
    getAnimations: () => {
        if (!playerInstance) return [];
        return getAnimationNames(playerInstance);
    },
    isInitialized: () => isPlayerInitialized.value,
});

watch(() => props.backgroundColor, (newBgColor) => {
    if (playerInstance && newBgColor) {
        try {
            playerInstance.bg.setFromString(newBgColor);
        } catch (error) {
            logMessage(`Error setting background color: ${error}`, "error");
        }
    }
});

watch(() => props.premultipliedAlpha, (newPAlpha) => {
    if (playerInstance && typeof newPAlpha === 'boolean') {
        playerInstance.config.premultipliedAlpha = newPAlpha;
    }
});

watch(() => props.backgroundImage, async () => {
    if (playerInstance) {
        await reloadCurrentSpine();
    }
});

watch(() => props.loopAnimation, async (shouldLoop) => {
    if (playerInstance && currentAnimationName.value) {
        logMessage(`Looping changed to ${shouldLoop}. Re-applying animation.`, "info");
        setPlayerAnimation(currentAnimationName.value);
    }
})

onMounted(() => {
    window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleKeydown);
    cleanupPlayer();
});
</script>

<template>
    <div ref="player-container" id="player-container" class="w-full h-full" tabindex="0" @keydown="handleKeydown" />
</template>

<style scoped>
#player-container {
    outline: none;
}
</style>
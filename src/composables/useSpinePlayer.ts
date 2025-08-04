import { nextTick, readonly, Ref, ref, watch } from "vue";

import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";

import { useCharactersStore } from "../stores/characters";

import { useLogger } from "./useLogger";

import { SpineSource } from "../types/spine";

import { BD2ModDetector } from "../utils/spineAssetDetector";
import { useSpineStore } from "../stores/spine";
import { useHistory } from "./useHistory";
import { storeToRefs } from "pinia";

// interface AnimationQueueItem {
//     animation: string;
//     trackIndex: number;
// }

declare const spine: any;

interface SpineAssetsData {
    modType?: string | null,
    modId?: string | null,
    skeletonFilename: string;
    atlasFilename: string;
    rawData?: Record<string, string>;
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

interface CameraState {
    x: number;
    y: number;
    zoom: number;
}

interface SpineError {
    type: string;
    title: string;
    message?: string;
    details?: string;
    showRetry?: boolean;
    actionLabel?: string;
    actionCallback?: () => void;
    failedAssets?: string[];
}

interface DownloadSkeletonState {
    isDownloading: boolean;
    downloadProgress: number;
    downloadError: string | null;
}

interface DownloadStartedPayload {
    destinationPath: string
}

interface DownloadProgressPayload {
    bytesDownloaded: number
    totalBytes: number
}

interface DownloadFinishedPayload {
    destinationPath: string
}

export function useSpinePlayer(playerContainer: Ref<HTMLElement | null>) {
    const spineStore = useSpineStore();
    const charactersStore = useCharactersStore();

    const { addToHistory } = useHistory();
    const { logMessage } = useLogger();

    const downloadSkeleton = ref<DownloadSkeletonState>({
        isDownloading: false,
        downloadProgress: 0,
        downloadError: null
    })

    const downloadEvents: {
        downloadStarted: UnlistenFn | null;
        downloadProgress: UnlistenFn | null;
        downloadFinished: UnlistenFn | null;
    } = {
        downloadStarted: null,
        downloadProgress: null,
        downloadFinished: null
    }

    let playerInstance: SpinePlayer | null;
    let userCamera: any | null = null;

    const defaultCameraState: CameraState = {
        x: 0,
        y: 0,
        zoom: 1
    };

    const {
        backgroundColor,
        backgroundImage,
        premultipliedAlpha,
        currentAnimation,
        source, animationTrigger,
        loopAnimation
    } = storeToRefs(spineStore);

    const currentRetryAttempt = ref<number>(0);
    const maxRetryAttempts = 2;

    const currentSource = ref<SpineSource | null>(null);

    const spineError = ref<SpineError | null>(null);

    const errorConfigs = {
        DirectoryNotFound: {
            title: 'Directory Not Found',
            message: 'The selected folder was not found.',
            showRetry: true
        },
        MissingSkeletonOrJson: {
            title: 'Missing Skeleton File',
            message: 'The selected folder is missing the required skeleton .json or .skel file.',
            showRetry: true,
            actionLabel: 'Download Original Skeleton from Github',
            actionCallback: downloadMissingSkeleton,
        },
        AssetLoadingError: {
            title: 'Asset Loading Error',
            message: 'Failed to load Spine assets.',
            showRetry: true,
        },
        AssetNotFoundError: {
            title: 'Asset Not Found',
            message: 'The asset was not found.',
            showRetry: true,
        },
        AssetTooManyRequestsError: {
            title: 'Too Many Requests',
            message: 'You have made too many requests. Please try again later.',
            showRetry: true
        },
        InitializationError: {
            title: 'Initialization Error',
            message: 'Failed to initialize the Spine player.',
            showRetry: true,
        },
        PlayerError: {
            title: 'Player Error',
            message: 'An error occurred in the Spine player.',
            showRetry: true,
        },
        SkeletonError: {
            title: 'Skeleton Error',
            message: 'Failed to load skeleton (.skel or .json). Skeleton might be corrupted or there is a mismatch between atlas and skeleton files.',
            showRetry: true,
        },

        // Download Errors
        SkeletonNotFound: {
            title: 'Skeleton Not Found',
            message: 'Oops! The skeleton asset is missing from the GitHub repository.',
            showRetry: false,
        },
        CharacterIdNotFound: {
            title: 'Character ID Not Found',
            message: 'Could not resolve character ID from the folder.',
            showRetry: false,
        },
        DirectoryInvalidError: {
            title: 'Invalid Directory',
            message: 'The selected directory is invalid or does not contain Spine assets.',
            showRetry: true,
        }
    };

    function handleError(errorType: string, details?: string, additionalData?: any): void {
        const config = errorConfigs[errorType] || {
            title: 'Unknown Error',
            message: 'An unexpected error occurred.',
            showRetry: true
        };

        spineError.value = {
            type: errorType,
            title: config.title,
            message: config.message,
            details: details,
            showRetry: config.showRetry,
            actionLabel: config.actionLabel,
            actionCallback: config.actionCallback,
            ...additionalData
        };

        logMessage(`${config.title}: ${details || config.message}`, "error");
    }

    function clearError(): void {
        spineError.value = null;
        currentRetryAttempt.value = 0;
    }

    async function loadSpineFromFolder(folderPath: string): Promise<{
        success: boolean,
        charId?: string,
        modType?: string | null
    } | undefined> {
        if (!folderPath) {
            logMessage("No folder path provided.", "error");
            return
        }

        spineStore.setIsPlayerLoading(true);

        currentRetryAttempt.value = 0;

        logMessage(`Loading Spine assets from: ${folderPath}`);

        try {
            const assetData = await invoke<SpineAssetsData>("get_spine_assets", { folderPath });

            console.log("Received spine assets data:", assetData);

            if (!assetData.skeletonFilename || !assetData.atlasFilename) {
                handleError('MissingSkeletonOrJson', 'Received incomplete spine assets data');
                logMessage("Received incomplete spine assets data.", "error");
                return
            }

            logMessage("Spine asset data loaded successfully.");
            logMessage(`Skeleton: ${assetData.skeletonFilename}`);
            logMessage(`Atlas: ${assetData.atlasFilename}`);

            let charId: string | undefined;

            if ((assetData.modType === "idle" || assetData.modType === "cutscene") && assetData.modId) {
                charId = assetData.modId;
            } else if (assetData.modType === "illustdating" && assetData.modId) {
                charId = charactersStore.getCharacterIdByDatingId(assetData.modId)
            }

            if (!charId) {
                logMessage("Could not resolve character ID from asset info", "warning");
            }

            const playerConfig = createPlayerConfig(assetData);

            await initializePlayer(playerConfig);

            return {
                success: true,
                charId,
                modType: assetData.modType
            };
        } catch (error) {
            logMessage(`Error loading spine assets from folder: ${JSON.stringify(error)}`, "error");

            if (error.type === 'DirectoryInvalidError') {
                handleError('DirectoryInvalidError', `${error.message[0]}: ${error.message[1]}`);
                return
            }

            handleError(error.type, error.message);
        }

        return;
    }

    async function loadSpineFromUrl(skeletonUrl: string, atlasUrl: string): Promise<{
        success: boolean,
        charId?: string,
        modType?: string | null
    } | undefined> {
        if (!skeletonUrl || !atlasUrl) {
            logMessage("Invalid URLs provided", "error");
            return;
        }

        logMessage(`Loading Spine assets from URL: ${skeletonUrl} and ${atlasUrl}`);

        spineStore.setIsPlayerLoading(true);
        currentRetryAttempt.value = 0;

        const assetInfo = BD2ModDetector.detect(skeletonUrl);

        logMessage(`Detected asset type: ${assetInfo.type}`, "info");

        let charId: string | undefined;

        if (assetInfo.characterId) {
            logMessage(`Character ID: ${assetInfo.characterId}`, "info");
            charId = assetInfo.characterId
        }
        if (assetInfo.datingId) {
            logMessage(`Dating ID: ${assetInfo.datingId}`, "info");
            charId = charactersStore.getCharacterIdByDatingId(assetInfo.datingId)
            logMessage(`Character ID: ${charId}`, "info");
        }

        if (!charId) {
            logMessage("Could not resolve character ID from asset info", "warning");
        }

        const playerConfig = createPlayerConfig({
            skeletonFilename: skeletonUrl,
            atlasFilename: atlasUrl
        });

        await initializePlayer(playerConfig);

        return {
            success: true,
            charId,
            modType: assetInfo.type || null
        }
    }

    function createPlayerConfig(assetData: any): any {
        const config: any = {
            atlasUrl: assetData.atlasFilename,
            showControls: true,
            alpha: true,
            showLoading: true,
            success: onPlayerSuccess,
            error: onPlayerError,
            update: onPlayerUpdate,
            premultipliedAlpha: premultipliedAlpha.value,
            backgroundColor: backgroundColor.value
        };

        if (backgroundImage.value) {
            config.backgroundImage = {
                url: backgroundImage.value
            };
        }

        if (assetData.skeletonFilename.endsWith('.json')) {
            config.jsonUrl = assetData.skeletonFilename;
        } else if (assetData.skeletonFilename.endsWith('.skel')) {
            config.skelUrl = assetData.skeletonFilename;
        } else {
            logMessage(`Unsupported skeleton file type: ${assetData.skeletonFilename}`, "error");
            return null;
        }

        if (assetData.rawData) { // only on folder
            config.rawDataURIs = assetData.rawData;
        }

        return config;
    }

    async function tryFallbackUrls(): Promise<boolean> {
        if (!currentSource.value || currentSource.value.type !== "url") {
            return false;
        }

        const hasFallback = currentSource.value.skeletonUrlFallback && currentSource.value.atlasUrlFallback;

        if (!hasFallback) {
            logMessage("No fallback URLs available", "warning");
            return false;
        }

        currentRetryAttempt.value++;

        if (currentRetryAttempt.value > maxRetryAttempts) {
            logMessage("Maximum retry attempts reached", "error");
            return false;
        }

        logMessage(`Attempting fallback (attempt ${currentRetryAttempt.value}/${maxRetryAttempts})`, "info");

        const fallbackSkeleton = currentSource.value.skeletonUrlFallback;
        const fallbackAtlas = currentSource.value.atlasUrlFallback;

        logMessage(`Fallback skeleton: ${fallbackSkeleton}`, "info");
        logMessage(`Fallback atlas: ${fallbackAtlas}`, "info");

        loadSpineFromUrl(fallbackSkeleton, fallbackAtlas)
        // spineStore.setSpineUrl(fallbackSkeleton, fallbackAtlas);

        return true;
    }

    async function initializePlayer(config: any): Promise<void> {
        if (!playerContainer.value) {
            logMessage("Critical Error: 'player-container' element not found", "error");
            return;
        }

        // Check if container has dimensions
        const rect = playerContainer.value.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            logMessage(`Warning: Container has no dimensions - width: ${rect.width}, height: ${rect.height}`, "warning");
        }

        if (!config) {
            logMessage("Invalid player configuration", "error");
            return;
        }

        await destroyPlayer();

        // clear container
        playerContainer.value.innerHTML = '';

        logMessage("Initializing new SpinePlayer instance");

        try {
            new spine.SpinePlayer("player-container", config);
            logMessage("SpinePlayer constructor called successfully");
        } catch (error) {
            logMessage(`Error creating SpinePlayer: ${error}`, "error");
            handleError("InitializationError", `Failed to create SpinePlayer: ${error}`);
        }
    }

    async function destroyPlayer(): Promise<void> {
        if (playerInstance) {
            logMessage("Destroying up the player.", "warning");

            try {
                playerInstance.dispose();
            } catch (error) {
                logMessage(`Error disposing player: ${error}`, "warning");
            }

            playerInstance = null;
            userCamera = null;

            // animations.value = []
            // currentAnimation.value = null;
            spineStore.setAnimations([]);
            spineStore.setCurrentAnimation(null);

            spineStore.setIsPlayerInitialized(false);
        }
    }

    function onPlayerSuccess(player: SpinePlayer): void {
        logMessage("SpinePlayer success callback triggered", "info");

        spineStore.setIsPlayerInitialized(true);
        spineStore.setIsPlayerLoading(false);

        currentRetryAttempt.value = 0; // Reset retry counter on success

        if (!player) {
            logMessage("Player instance is null in success callback", "error");
            return;
        }

        playerInstance = player;

        try {
            player.skeleton.setToSetupPose();
            player.skeleton.updateWorldTransform();

            initializeCamera(player);

            const animationNames = getAnimationNames(player);

            logMessage(`Animations found: ${animationNames.join(', ')}`, "info");

            const defaultAnimation = getDefaultAnimation(animationNames);

            if (defaultAnimation) {
                logMessage(`Setting default animation: ${defaultAnimation}`, "info");
                setPlayerAnimation(defaultAnimation);
            }

            // animations.value = animationNames
            // currentAnimation.value = defaultAnimation;
            spineStore.setAnimations(animationNames);
            spineStore.setCurrentAnimation(defaultAnimation);

            player.play();

            logMessage("Spine player fully initialized and ready", "info");

        } catch (error) {
            logMessage(`Error in player success callback: ${error}`, "error");
            handleError("InitializationError", `Failed to initialize player: ${error}`);
        }
    }

    async function onPlayerError(player: SpinePlayer, message: string): Promise<void> {
        spineStore.setIsPlayerLoading(false);

        function parseErrorJson(message: string): { failedUrls: string[], errorData: any } | null {
            const jsonMatch = message.match(/\{.*\}/);
            if (!jsonMatch) return null;

            try {
                const decodedJson = jsonMatch[0]
                    .replace(/&#34;/g, '"')
                    .replace(/&#39;/g, "'");

                const errorData = JSON.parse(decodedJson);
                const failedUrls = Object.keys(errorData);

                return { failedUrls, errorData };
            } catch (e) {
                console.warn('Could not parse error JSON:', e);
                return null;
            }
        }

        const parsedError = parseErrorJson(message);

        // Check if we should attempt fallback
        const shouldTryFallback = (
            message.includes("404") ||
            message.includes("403") ||
            message.includes("429") ||
            message.includes("413") || // Payload too large
            message.includes("502") || // Bad gateway  
            message.includes("503") || // Service unavailable
            /Error: Assets could not be loaded\./.test(message)
        );

        if (shouldTryFallback && currentRetryAttempt.value < maxRetryAttempts) {
            logMessage(`Asset loading failed. Attempting fallback... (${message.substring(0, 100)})`, "warning");

            const fallbackAttempted = await tryFallbackUrls();

            if (fallbackAttempted) {
                await nextTick();
                await reloadCurrentSpine();
                return; // Don't show error yet, retry with fallback first
            }
        }

        // If we reach here, either no fallback available or all attempts failed

        // Handle specific error types
        if (/Error: Assets could not be loaded\./.test(message)) {
            if (message.includes("404")) {
                handleError('AssetNotFoundError', 'Assets not found on both primary and fallback sources', {
                    failedAssets: parsedError?.failedUrls || []
                });
                return;
            }

            if (message.includes("429")) {
                handleError('AssetTooManyRequestsError', message, {
                    failedAssets: parsedError?.failedUrls || []
                });
                return;
            }

            if (message.includes("413")) {
                handleError('AssetLoadingError', 'Asset is too large (>50MB limit on jsDelivr)', {
                    failedAssets: parsedError?.failedUrls || []
                });
                return;
            }

            if (parsedError) {
                handleError('AssetLoadingError', `Failed to load ${parsedError.failedUrls.length} asset(s) from all sources`, {
                    failedAssets: parsedError.failedUrls,
                });
            } else {
                handleError('AssetLoadingError', message);
            }
            return;
        }
        else if (/Error: Could not load skeleton binary./.test(message)) {
            let details = message.replace(/Error: Could not load skeleton binary\./, '').trim();
            handleError('SkeletonError', details);
            return;
        }

        if (parsedError) {
            handleError('AssetLoadingError', `Failed to load ${parsedError.failedUrls.length} asset(s) from all sources`, {
                failedAssets: parsedError.failedUrls,
            });
            return;
        }

        handleError('PlayerError', message);
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

    // Camera functions
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
            logMessage("Player or camera not initialized yet.", "warning");
            return;
        }

        logMessage(`Resetting camera to: ${JSON.stringify(defaultCameraState)}`);

        userCamera.position.x = defaultCameraState.x;
        userCamera.position.y = defaultCameraState.y;
        userCamera.zoom = defaultCameraState.zoom;
    }


    // some helper functons
    function getAnimationNames(player: SpinePlayer): string[] {
        return player.skeleton.data.animations.map(anim => anim.name);
    }

    function getDefaultAnimation(animations: string[]): string | null {
        const lowerAnims = animations.map(name => name.toLowerCase());
        const allAnimationIndex = lowerAnims.indexOf("all");

        if (allAnimationIndex !== -1) {
            return animations[allAnimationIndex];
        }

        return animations.length > 0 ? animations[0] : null;
    }

    async function downloadMissingSkeleton(): Promise<void> {
        if (!currentSource.value || currentSource.value.type !== "folder") {
            logMessage("No valid folder source to download skeleton from.", "error");
            return;
        }

        logMessage(`Starting skeleton download for: ${JSON.stringify(currentSource.value)}`, 'info')

        async function setupListeners() {
            try {
                downloadEvents.downloadStarted = await listen<DownloadStartedPayload>('download-started', (event) => {
                    logMessage(`Download started (destPath=${event.payload.destinationPath}).`, 'info')
                    downloadSkeleton.value.isDownloading = true
                    downloadSkeleton.value.downloadProgress = 0
                })

                downloadEvents.downloadProgress = await listen<DownloadProgressPayload>('download-progress', (event) => {
                    const { bytesDownloaded, totalBytes } = event.payload
                    downloadSkeleton.value.downloadProgress = (bytesDownloaded / totalBytes) * 100

                    // log progress
                    if (downloadSkeleton.value.downloadProgress % 10 === 0) {
                        logMessage(`Download progress: ${downloadSkeleton.value.downloadProgress.toFixed(2)}%`, 'info')
                    }
                })

                downloadEvents.downloadFinished = await listen<DownloadFinishedPayload>('download-finished', (event) => {
                    logMessage(`Download finished successfully (destPath=${event.payload.destinationPath}).`, 'success')
                    downloadSkeleton.value.downloadProgress = 100
                    downloadSkeleton.value.isDownloading = false
                })

                logMessage('Download event listeners initialized.')
            } catch (error) {
                logMessage(`Failed to setup download listeners: ${error}`, 'error')
            }
        }

        function removeListeners() {
            Object.values(downloadEvents).forEach(unlisten => unlisten?.())
            downloadEvents.downloadStarted = null;
            downloadEvents.downloadProgress = null;
            downloadEvents.downloadFinished = null;
            logMessage('Download event listeners removed.')
        }

        // add event listener for download progress

        resetDownloadSkeletonState()

        await setupListeners()

        try {
            await invoke('download_missing_skeleton', { folderPath: currentSource.value.path })

            // for testing
            // downloadSkeleton.value.isDownloading = true;
            // await new Promise((resolve) => {
            //     let progress = 0;
            //     const interval = setInterval(() => {
            //         progress += Math.random() // random
            //         downloadSkeleton.value.downloadProgress = progress;
            //         if (progress >= 100) {
            //             clearInterval(interval);
            //             resolve(true);
            //         }
            //     }, 50);
            // });
            // downloadSkeleton.value.isDownloading = false;

            logMessage('Skeleton download completed successfully.', 'success')

            await reloadCurrentSpine()
        } catch (error) {
            logMessage(`Download missing skeleton failed: ${JSON.stringify(error)}`, 'error')

            downloadSkeleton.value.isDownloading = false;

            const errorMessage = error.message || 'Failed to download the skeleton file.'

            // show error
            handleError(
                error.type || 'DownloadError',
                errorMessage
            )
        }

        removeListeners()
    }

    function resetDownloadSkeletonState(): void {
        downloadSkeleton.value.isDownloading = false;
        downloadSkeleton.value.downloadProgress = 0;
        downloadSkeleton.value.downloadError = null;
    }

    function setPlayerAnimation(animationName: string, loopAnimation: boolean = true): boolean {
        if (!playerInstance) {
            logMessage(`Cannot set animation '${animationName}': Player not initialized`, "warning");
            return false;
        }

        // playerInstance.animationState.clearTracks();

        try {
            playerInstance.play();

            const trackEntry = playerInstance.animationState.setAnimation(0, animationName, loopAnimation);

            if (!loopAnimation) {
                trackEntry.listener = {
                    complete: () => {
                        if (playerInstance) {
                            playerInstance.pause();
                            logMessage(`Animation '${animationName}' completed and player is now paused.`, "info");
                        }
                    }
                };
            }

            logMessage(`Playing animation: ${animationName} (loop=${loopAnimation})`, "info");

            // doesnt needed because if animation is being set, it means it was changed
            // spineStore.currentAnimation = animationName;

            return true
        } catch (error) {
            logMessage(`Error setting animation: ${error}`, "error");
        }

        return false
    }

    async function handleSource(source: SpineSource): Promise<void> {
        // clear error
        clearError()

        // wait for playerContainer 
        await nextTick();

        if (!playerContainer.value) {
            logMessage("PlayerContainer not found!!!", "error");
            return;
        }

        if (source.type === "folder" && source.path) {
            await loadSpineFromFolder(source.path).then((result) => {
                currentSource.value = source;

                if (!result?.success) {
                    logMessage("Failed to load spine from folder.", "error");
                } else {
                    logMessage(`Successfully loaded spine from folder: ${result.charId}`, "success");

                    addToHistory(
                        source,
                        result.charId,
                        result.modType,
                    )
                }
            });
        } else if (source.type === "url" && (source.atlasUrl && source.skeletonUrl)) {
            await loadSpineFromUrl(source.skeletonUrl, source.atlasUrl).then((result) => {
                currentSource.value = source;

                if (!result?.success) {
                    logMessage("Failed to load spine from URL.", "error");
                } else {
                    logMessage(`Successfully loaded spine from URL: ${result.charId}`, "info");
                    addToHistory(
                        source,
                        result.charId,
                        result.modType,
                    )
                }
            });
        }
    }

    async function reloadCurrentSpine(): Promise<void> {
        console.log("Reloading current spine...");

        if (!currentSource.value) {
            logMessage("No spine source set. Cannot reload.", "warning");
            return
        }

        await handleSource(currentSource.value)
    }

    // I'M GOING TO COMMENT THIS OUT FOR NOW
    // fuck queue
    // function setPlayerQueue(queue: AnimationQueueItem[]): void {
    //     if (!playerInstance) {
    //         logMessage("Cannot set animation queue: Player not initialized", "warning");
    //         return;
    //     }

    //     if (queue.length === 0) {
    //         logMessage("Animation queue is empty. Stopping player.", "info");
    //         playerInstance.pause();
    //         return;
    //     }

    //     logMessage(`Setting animation queue with ${queue.length} items`, "info");
    //     console.log(queue);

    //     playerInstance.animationState.clearTracks();
    //     playerInstance.animationState.clearListeners();

    //     const firstItem = queue[0];
    //     if (firstItem && firstItem.animation) {
    //         logMessage(`Setting first animation: ${firstItem.animation}`, "info");
    //         playerInstance.animationState.setAnimation(0, firstItem.animation, false);
    //     }

    //     for (let i = 1; i < queue.length - 1; i++) {
    //         const item = queue[i];
    //         if (item && item.animation) {
    //             logMessage(`Adding middle animation: ${item.animation}`, "info");
    //             playerInstance.animationState.addAnimation(0, item.animation, false, 0);
    //         }
    //     }

    //     if (queue.length > 1) {
    //         const lastItem = queue[queue.length - 1];
    //         if (lastItem && lastItem.animation) {
    //             logMessage(`Adding last animation: ${lastItem.animation}`, "info");
    //             const shouldLoop = spineStore.loopAnimation;

    //             if (shouldLoop) {
    //                 const trackEntry = playerInstance.animationState.addAnimation(0, lastItem.animation, false, 0);
    //                 trackEntry.listener = {
    //                     complete: () => {
    //                         logMessage("Queue completed, restarting due to loop setting", "info");
    //                         setPlayerQueue(queue);
    //                     }
    //                 };
    //             } else {
    //                 playerInstance.animationState.addAnimation(0, lastItem.animation, false, 0);
    //             }
    //         }
    //     }

    //     playerInstance.play();
    // }

    // watch(() => spineStore.animationQueue, (newQueue) => {
    //     console.log(newQueue)
    //     if (newQueue && newQueue.length > 0) {
    //         logMessage(`Animation queue updated with ${newQueue.length} items`, "info");
    //         setPlayerQueue(newQueue);
    //     }
    // }, {deep: true, immediate: true});

    // watch(() => spineStore.playQueue, (play) => {
    //     if (playerInstance) {
    //         if (play) {
    //             logMessage("Player started playing from queue", "info");
    //             // get queue
    //             const queue = spineStore.animationQueue;
    //             setPlayerQueue(queue)

    //             spineStore.setPlayQueue(false);
    //         }
    //     }
    // })

    function setPremultipliedAlpha(value: boolean): void {
        premultipliedAlpha.value = value;

        if (!playerInstance) {
            logMessage("Cannot set premultiplied alpha: Player not initialized", "warning");
            return;
        }

        // update player config

        playerInstance.config.premultipliedAlpha = value;
    }

    function setBackgroundColor(color: string): void {
        if (!playerInstance) {
            logMessage("Cannot set background color: Player not initialized", "warning");
            return;
        }

        try {
            playerInstance.bg.setFromString(color);
            logMessage(`Background color set to: ${color}`, "info");
        } catch (error) {
            logMessage(`Error setting background color: ${error}`, "error");
        }
    }

    function setBackgroundImage(imageUrl: string): void {
        backgroundImage.value = imageUrl;

        if (!playerInstance) {
            logMessage("Cannot set background image: Player not initialized", "warning");
            return;
        }

        playerInstance.bg.setFromString(imageUrl);

        logMessage(`Background image set to: ${imageUrl}`, "info");
    }

    // --------------------------
    // from store to composable
    watch(backgroundColor, (newColor) => {
        if (!newColor) {
            logMessage("Invalid background color provided", "error");
            return;
        }

        setBackgroundColor(newColor);
    });

    watch(source, async (source) => {
        if (!source) {
            logMessage("No source provided. Cannot set source.", "warning");
            return;
        }
        await handleSource(source);
    })

    watch(premultipliedAlpha, (value) => {
        setPremultipliedAlpha(value);
    })

    watch(backgroundImage, (imageUrl) => {
        if (!imageUrl) {
            logMessage("Invalid image URL provided", "error");
            return;
        }
        setBackgroundImage(imageUrl);
    })

    watch([currentAnimation, animationTrigger], ([animation]) => {
        if (typeof animation === 'string') {
            setPlayerAnimation(animation, loopAnimation.value);
        }
    })

    watch(loopAnimation, (shouldLoop) => {
        if (playerInstance && currentAnimation.value) {
            logMessage(`Looping changed to ${shouldLoop}. Re-applying animation.`, "info");
            setPlayerAnimation(currentAnimation.value, shouldLoop);
        }
    })

    watch(backgroundColor, (newColor) => {
        if (!newColor) {
            logMessage("Invalid background color provided", "error");
            return;
        }
        setBackgroundColor(newColor);
    });

    return {
        handleSource,
        currentSource: readonly(currentSource),
        downloadSkeletonState: readonly(downloadSkeleton),
        error: spineError,
        destroyPlayer,
        resetCameraToDefault,
        reloadCurrentSpine,
        setPlayerAnimation,
        setBackgroundColor,
        setPremultipliedAlpha,
        setBackgroundImage,
        loadSpineFromFolder,
        loadSpineFromUrl,
    }
}
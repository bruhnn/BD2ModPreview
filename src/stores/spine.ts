import { readonly, ref } from "vue";
import { defineStore } from "pinia";
import { SpineSource } from "../types/spine";

// interface AnimationQueueItem {
//     animation: string;
//     trackIndex: number;
// }

export const useSpineStore = defineStore('spine', () => {
    const isPlayerInitialized = ref(false);
    const isPlayerLoading = ref(false);

    const premultipliedAlpha = ref(false);
    const backgroundColor = ref('#0F172A');
    const backgroundImage = ref<string | null>(null)

    const animationTrigger = ref(0); // to trigger the same animation 

    const allAnimations = ref<string[]>([]);
    const currentAnimation = ref<string | null>(null)
    const loopAnimation = ref<boolean>(true);

    // const animationQueue = ref<AnimationQueueItem[]>([]);
    // const playQueue = ref<boolean>(false);

    const source = ref<SpineSource | null>(null);

    const setIsPlayerInitialized = (initialized: boolean) => {
        isPlayerInitialized.value = initialized;
    }

    const setIsPlayerLoading = (loading: boolean) => {
        isPlayerLoading.value = loading;
    }

    const setBackgroundColor = (color: string) => {
        backgroundColor.value = color;
    }

    const setBackgroundImage = (url: string) => {
        backgroundImage.value = url
    }

    const removeBackgroundImage = () => {
        if (backgroundImage.value?.startsWith('blob:')) {
            URL.revokeObjectURL(backgroundImage.value);
        }
        backgroundImage.value = null
    }

    const setAnimations = (animations: string[]) => {
        allAnimations.value = animations
    }

    const setCurrentAnimation = (animation: string | null) => {
        currentAnimation.value = animation
        // triggerRef(currentAnimation)
        animationTrigger.value += 1;
    }

    const playAllAnimations = () => {
        // The actual cycling logic is handled in useSpinePlayer composable
        // This just triggers the animation change
        return true;
    }

    // const addAnimationToQueue = (animation: string) => {
    //     animationQueue.value.push({
    //         animation: animation,
    //         trackIndex: 0
    //     });
    // }

    // const removeAnimationFromQueue = (index: number) => {
    //     if (index < 0 || index >= animationQueue.value.length) {
    //         console.warn(`Index ${index} is out of bounds for animation queue.`);
    //         return;
    //     }
    //     animationQueue.value.splice(index, 1);
    // }

    // const clearAnimationQueue = () => {
    //     animationQueue.value = [];
    // }

    // const playAnimationQueue = () => {
    //     playQueue.value = true;
    // }

    // const stopAnimationQueue = () => {
    //     playQueue.value = false;
    // }

    // const setPlayQueue = (value: boolean) => {
    //     playQueue.value = value;
    // }

    const setSpineFolder = (folderPath: string) => {
        source.value = {
            type: "folder",
            path: folderPath
        }
    }

    const setSpineUrl = (skeletonUrl: string, atlasUrl: string, skeletonUrlFallback?: string, atlasUrlFallback?: string) => {
        source.value = {
            type: "url",
            skeletonUrl,
            atlasUrl,
            skeletonUrlFallback,
            atlasUrlFallback
        }
    }

    function clearSource() {
        source.value = null;
    }

    return {
        // states
        isPlayerInitialized: readonly(isPlayerInitialized),
        setIsPlayerInitialized,
        isPlayerLoading: readonly(isPlayerLoading),
        setIsPlayerLoading,
        source: readonly(source),
        clearSource,

        premultipliedAlpha: premultipliedAlpha,
        backgroundColor: backgroundColor,
        backgroundImage: readonly(backgroundImage),
        loopAnimation: loopAnimation,

        animations: readonly(allAnimations),
        currentAnimation,
        animationTrigger,
        // animationQueue: animationQueue,
        // playQueue: readonly(playQueue),

        // actionss
        setBackgroundColor,
        setBackgroundImage,
        removeBackgroundImage,

        setAnimations,
        setCurrentAnimation,
        playAllAnimations,

        // addAnimationToQueue,
        // removeAnimationFromQueue,
        // clearAnimationQueue,
        // setPlayQueue,
        // playAnimationQueue,
        // stopAnimationQueue,

        setSpineFolder,
        setSpineUrl
    }
})
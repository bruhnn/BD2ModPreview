<script setup lang="ts">
import {
    RadioGroup,
    RadioGroupLabel,
    RadioGroupOption,
    Switch,
    SwitchGroup,
    SwitchLabel,
} from '@headlessui/vue'
import { onMounted, ref } from 'vue';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';

defineProps<{
    showControls: boolean;
    animations: string[];
}>();

const defaultBackgroundColor = ref<string | undefined>('');

const premultipliedAlpha = defineModel<boolean>("premultipliedAlpha")
const backgroundColor = defineModel<string>("backgroundColor")
const backgroundImage = defineModel<string | null>("backgroundImage")
const currentAnimation = defineModel<string>("currentAnimation");
const loopAnimation = defineModel<boolean>("loopAnimation");

// const animationQueue = defineModel<string[]>("animationQueue")
const animationQueue = ref<string[]>([])

const fileInput = ref<HTMLInputElement | null>(null);

function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
        backgroundImage.value = URL.createObjectURL(file);
        console.log("Selected image:", backgroundImage.value);
    }
}

const emit = defineEmits([
    "close",
    "selectFolder",
    "openLogs",
    'update:backgroundColor',
    'update:premultipliedAlpha',
    'update:backgroundImage',
    'update:loopAnimation',
    'update:animationQueue',
    "playAnimation",
    // "playQueue",
]);

async function handleBgImageSelect() {
    try {
        const selectedPath = await open({
            multiple: false,
            filters: [{
                name: 'Images',
                extensions: ['png', 'jpg', 'jpeg', 'webp']
            }]
        });

        if (selectedPath) {
            backgroundImage.value = convertFileSrc(selectedPath);
            console.log(backgroundImage.value)
        }
    } catch (error) {
        console.error("Error opening file dialog:", error);
    }
}

function removeBgImage() {
    if (backgroundImage.value?.startsWith('blob:')) {
        URL.revokeObjectURL(backgroundImage.value);
    }
    backgroundImage.value = null;
}

// queue
// const playQueue = () => {
//     console.log("playing queue controls")
//     emit("playQueue", animationQueue.value)
// }

// const addToQueue = (animationName: string) => {
//     if (!animationQueue.value) {
//         animationQueue.value = [];
//     }

//     animationQueue.value.push(animationName);
// };

// const removeFromQueue = (index: number) => {
//     if (animationQueue.value) {
//         animationQueue.value.splice(index, 1);
//     }
// };

// const clearQueue = () => {
//     if (animationQueue.value) {
//         animationQueue.value.length = 0;
//     }
//     emit('clearQueue');
// };

onMounted(() => {
    defaultBackgroundColor.value = backgroundColor.value
})
</script>

<template>
    <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100" leave-active-class="duration-200 ease-in"
        leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
        <div v-show="showControls" v-draggable-resizable
            class="fixed overflow-hidden z-50 top-8 left-8 bg-gradient-to-br pointer-events-auto max-h-[90vh] overflow-y-auto from-slate-900 to-slate-800 backdrop-blur-xl border border-slate-700/50 text-slate-200 p-6 rounded-2xl w-96 flex flex-col gap-6 shadow-2xl scrollbar scrollbar-thumb-slate-600 scrollbar-track-slate-800">

            <!-- Header -->
            <div class="flex items-center justify-between cursor-move drag-handle">
                <h3 class="text-lg font-semibold text-white select-none">Controls</h3>
                <button @click="$emit('close')"
                    class="text-slate-400 hover:text-white transition-colors cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                        fill="currentColor">
                        <path
                            d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                    </svg>
                </button>
            </div>

            <!-- Settings Section -->
            <div class="space-y-4">
                <h4 class="text-sm font-medium text-slate-300 uppercase tracking-wide">Render</h4>

                <SwitchGroup>
                    <div class="flex items-center gap-2">
                        <Switch v-model="premultipliedAlpha" :class='premultipliedAlpha ? "bg-gray-200" : "bg-gray-600"'
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer">
                            <span :class='premultipliedAlpha ? "translate-x-6" : "translate-x-1"'
                                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" />
                        </Switch>
                        <SwitchLabel class="mr-4 cursor-pointer select-none">Premultiplied Alpha</SwitchLabel>
                    </div>
                </SwitchGroup>

                <div class="space-y-2">
                    <label class="text-sm font-medium text-slate-300 select-none">Background Color</label>
                    <div class="relative flex gap-1">
                        <input type="color" v-model="backgroundColor"
                            class="w-full h-10 rounded-lg cursor-pointer border-2 border-slate-600 hover:border-slate-500 transition-colors" />
                        <div
                            class="absolute inset-0 rounded-lg pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent">
                        </div>
                        <button class="p-2 bg-gray-600 rounded-md cursor-pointer"
                            @click="backgroundColor = defaultBackgroundColor">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                                fill="#e3e3e3">
                                <path
                                    d="M440-122q-121-15-200.5-105.5T160-440q0-66 26-126.5T260-672l57 57q-38 34-57.5 79T240-440q0 88 56 155.5T440-202v80Zm80 0v-80q87-16 143.5-83T720-440q0-100-70-170t-170-70h-3l44 44-56 56-140-140 140-140 56 56-44 44h3q134 0 227 93t93 227q0 121-79.5 211.5T520-122Z" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="space-y-2">
                    <label class="text-sm font-medium text-slate-300 select-none">Background Image</label>
                    <div class="relative flex gap-1">
                        <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden"
                            @change="handleFileChange" />

                        <button @click="fileInput?.click()"
                            class="w-full h-10 px-4 bg-gray-600 rounded-md cursor-pointer flex items-center justify-center text-slate-300 hover:bg-gray-500 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px"
                                fill="currentColor" class="mr-2">
                                <path
                                    d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm40-80h480L520-590 380-420l-80-100-60 80Zm-40 80v-560 560Z" />
                            </svg>
                            Choose Image
                        </button>

                        <button v-if="backgroundImage" @click="removeBgImage"
                            class="p-2 bg-gray-600 rounded-md cursor-pointer hover:bg-red-500 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                                fill="#e3e3e3">
                                <path
                                    d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Animations Section -->
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <h4 class="text-sm font-medium text-slate-300 uppercase tracking-wide">Animations</h4>
                    <span class="text-xs text-slate-500">{{ animations.length }} available</span>
                </div>

                <SwitchGroup>
                    <div class="flex items-center gap-2">
                        <Switch v-model="loopAnimation" :class='loopAnimation ? "bg-slate-500" : "bg-gray-600"'
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer">
                            <span :class='loopAnimation ? "translate-x-6" : "translate-x-1"'
                                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" />
                        </Switch>
                        <SwitchLabel class="mr-4 cursor-pointer select-none">Loop Animation</SwitchLabel>
                    </div>
                </SwitchGroup>

                <div
                    class="max-h-64 space-y-2 overflow-y-auto scrollbar scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                    <RadioGroup v-model="currentAnimation" class="flex gap-2 flex-col">
                        <RadioGroupOption v-for="anim in animations" :key="anim" :value="anim"
                            v-slot="{ active, checked }" as="template">
                            <div @click="checked ? null : $emit('playAnimation', anim)" :class="[
                                'group select-none flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all duration-200',
                                checked
                                    ? 'border-slate-500 bg-slate-700/60 shadow-lg'
                                    : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-700/50',
                                active ? 'ring-1 ring-slate-600' : ''
                            ]">
                                <RadioGroupLabel as="span" :class="[
                                    'truncate text-sm font-medium',
                                    checked ? 'text-slate-100' : 'text-slate-200'
                                ]">
                                    {{ anim }}
                                </RadioGroupLabel>

                                <div class="flex gap-2 align-center justify-center items-center">
                                    <!-- <button @click.stop="addToQueue(anim)"
                                        class="text-xs flex items-center gap-1 cursor-pointer text-gray-300 hover:text-gray-400 p-2 rounded-full transition-colors bg-slate-700 h-full w-full"
                                        title="Add to Queue">
                                        <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960"
                                            width="16px" fill="#e3e3e3">
                                            <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" />
                                        </svg>
                                        Queue
                                    </button> -->

                                    <div v-show="checked" class="shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" height="24px"
                                            width="24px" fill="currentColor">
                                            <path d="M400-304 240-464l56-56 104 104 264-264 56 56-320 320Z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </RadioGroupOption>
                    </RadioGroup>
                </div>
            </div>

            <!-- Queue Section -->
            <!-- <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <h4 class="text-sm font-medium text-slate-300 uppercase tracking-wide">Queue</h4>
                    <div class="flex gap-2">
                        <span class="text-xs text-slate-500">{{ animationQueue?.length || 0 }} items</span>
                        <button v-if="animationQueue && animationQueue.length > 0" @click="clearQueue"
                            class="text-xs cursor-pointer text-red-400 hover:text-red-300 transition-colors">
                            Clear All
                        </button>
                    </div>
                </div>

                <button v-if="animationQueue && animationQueue.length > 0" @click="playQueue"
                    class="w-full cursor-pointer flex items-center justify-center gap-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px"
                        fill="currentColor">
                        <path d="M320-200v-560l440 280-440 280Z" />
                    </svg>
                    Play Queue
                </button>

                <div v-if="animationQueue && animationQueue.length > 0"
                    class="space-y-2 max-h-48 overflow-y-auto scrollbar scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                    <div v-for="(anim, index) in animationQueue" :key="`${anim}-${index}`"
                        class="group flex items-center justify-between bg-gradient-to-r from-slate-800/40 to-slate-700/40 border border-slate-600/30 p-3 rounded-xl hover:from-slate-800/60 hover:to-slate-700/60 transition-all duration-200">
                        <div class="flex items-center gap-3">
                            <div
                                class="w-6 h-6 bg-slate-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                {{ index + 1 }}
                            </div>
                            <span class="text-sm font-medium text-slate-200">{{ anim }}</span>
                        </div>
                        <button @click="removeFromQueue(index)"
                            class="opacity-0 group-hover:opacity-100 cursor-pointer text-gray-400 hover:text-red-400 transition-all duration-300 p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                                fill="currentColor">
                                <path
                                    d="m336-280-56-56 144-144-144-143 56-56 144 144 143-144 56 56-144 143 144 144-56 56-143-144-144 144Z" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div v-else class="text-center py-8">
                    <div class="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg class="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10">
                            </path>
                        </svg>
                    </div>
                    <p class="text-sm text-slate-400">Queue is empty</p>
                    <p class="text-xs text-slate-500 mt-1">Add animations to build a sequence</p>
                </div>
            </div> -->

            <!-- Actions Section -->
            <div class="space-y-4">
                <h4 class="text-sm font-medium text-slate-300 uppercase tracking-wide">Actions</h4>
                <div class="grid grid-cols-1 gap-3">
                    <button @click="$emit('selectFolder')"
                        class="flex cursor-pointer items-center justify-center gap-2 bg-gradient-to-l from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                            fill="#e3e3e3">
                            <path
                                d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z" />
                        </svg>
                        Select Folder
                    </button>
                    <button @click="$emit('openLogs')"
                        class="flex cursor-pointer items-center justify-center gap-2 bg-gradient-to-l from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                            fill="#e3e3e3">
                            <path
                                d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z" />
                        </svg>
                        Open Logs
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped></style>
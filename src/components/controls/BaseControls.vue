<script setup lang="ts">
import { Listbox, ListboxButton, ListboxOptions, ListboxOption, TransitionRoot, RadioGroupOption, RadioGroup, RadioGroupLabel } from '@headlessui/vue'
import {
    Switch,
    SwitchGroup,
    SwitchLabel,
} from '@headlessui/vue'
import { onMounted, ref, computed, watch } from 'vue';
import { getVersion } from '@tauri-apps/api/app';

import { useSpineStore } from "../../stores/spine"
import { useUIStore } from '../../stores/ui';

const uiStore = useUIStore();
const spineStore = useSpineStore()
const appVersion = ref<string | null>(null)
const defaultBackgroundColor = ref(spineStore.backgroundColor)
const fileInput = ref<HTMLInputElement | null>(null)

const isFloating = computed(() => uiStore.controlsPosition === 'floating')

const toggleIcon = computed(() =>
    isFloating.value
        ? 'M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm120-80v-560H200v560h120Zm80 0h360v-560H400v560Zm-80 0H200h120Z'
        : 'M520-400h200v-240H520v240ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480Zm0 0v-480 480Z'
)

const toggleAction = computed(() =>
    isFloating.value ? uiStore.setControlsToSidebar : uiStore.setControlsToFloating
)

function handleBackgroundImageChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
        spineStore.setBackgroundImage(URL.createObjectURL(file));
    }
}

function selectAnimation(animation: string) {
    if (animation === 'All') {
        // Play all animations in sequence
        spineStore.setCurrentAnimation('All');
        spineStore.playAllAnimations();
    } else {
        spineStore.setCurrentAnimation(animation);
    }
}

// function addToQueue(animation: string) {
//     //
//     spineStore.addAnimationToQueue(animation);
// }

// function removeFromQueue(index: number) {
//     spineStore.removeAnimationFromQueue(index);
// }

// function playQueue() {
//     spineStore.playAnimationQueue();
// }

// function stopQueue() {
//     spineStore.stopAnimationQueue();
// }

// function clearQueue() {
//     spineStore.clearAnimationQueue();
// }

const displayPath = ref<string | null>(null);

// Computed property to add "All" option
const animationsWithCombined = computed(() => {
    if (!spineStore.animations || spineStore.animations.length === 0) {
        return [];
    }
    if (spineStore.animations.length <= 1) {
        return spineStore.animations;
    }
    return [...spineStore.animations, 'All'];
});

watch(
    () => spineStore.source?.path,
    (newPath) => {
        if (newPath) {
            displayPath.value = newPath;
        } else {
            setTimeout(() => {
                displayPath.value = null;
            }, 200);
        }
    },
    { immediate: true }
);

onMounted(async () => {
    appVersion.value = await getVersion();
})

function getFolderName(path: string | null | undefined): string {
    if (!path) return '';
    const parts = path.split(/[/\\]/);
    return parts.pop() || '';
}

const displayLanguages = {
    en: 'English',
    pt: 'Português',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    zh: '中文',
    ja: '日本語',
    ko: '한국어',
    ru: 'Русский'
}

import { useI18n } from 'vue-i18n';

const { t, availableLocales, locale } = useI18n();

watch(locale, (newLocale) => {
    uiStore.setLanguage(newLocale);
});
</script>
<template>
    <div class="h-full flex flex-col">
        <div class="flex items-center justify-between h-[60px] drag-handle p-4 gap-2">
            <div class="flex-1 min-w-0 flex-col">
                <h3 class="text-lg font-semibold text-white select-none">{{ t('controls.title') }}</h3>
                <TransitionRoot :show="spineStore.source?.type === 'folder'" enter="transition-opacity duration-200"
                    enter-from="opacity-0" enter-to="opacity-100" leave="transition-opacity duration-200"
                    leave-from="opacity-100" leave-to="opacity-0">
                    <p class="text-xs text-slate-400 truncate block overflow-hidden whitespace-nowrap"
                        :title="displayPath || t('controls.noSource')">
                        {{ getFolderName(displayPath) }}
                    </p>
                </TransitionRoot>
            </div>
            <div class="flex gap-2">
                <button @click="toggleAction" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                        fill="currentColor">
                        <path :d="toggleIcon" />
                    </svg>
                </button>
                <button @click="uiStore.closeControls"
                    class="text-slate-400 hover:text-white transition-colors cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                        fill="currentColor">
                        <path
                            d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                    </svg>
                </button>
            </div>
        </div>

        <div>
            <div class="flex w-full text-xs justify-evenly py-0 text-slate-300 mb-1">
                <a href="https://github.com/bruhnn/BD2ModPreview/issues" target="_blank" rel="noopener noreferrer"
                    class="flex gap-2 justify-center items-center group hover:text-slate-100 cursor-pointer transition-colors"
                    :aria-label="t('controls.links.suggestFeature')">
                    <svg class="w-5 h-5 text-orange-200 transform group-hover:scale-105 transition-all"
                        xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
                        <path
                            d="M760-360q12-12 28.5-12t28.5 12l63 64q12 12 12 28t-12 28q-12 12-28 12t-28-12l-64-63q-12-12-12-28.5t12-28.5Zm40-480q12 12 12 28.5T800-783l-63 63q-12 12-28.5 12T680-720q-12-12-12-28.5t12-28.5l64-63q12-12 28-12t28 12Zm-640 0q12-12 28.5-12t28.5 12l63 64q12 12 12 28t-12 28q-12 12-28.5 12T223-720l-63-63q-12-12-12-28.5t12-28.5Zm40 480q12 12 12 28.5T200-303l-63 63q-12 12-28.5 12T80-240q-12-12-12-28.5T80-297l64-63q12-12 28-12t28 12Zm154 73 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97-33 143Zm126-194Zm0 212L314-169q-11 7-23 6t-21-8q-9-7-14-17.5t-2-23.5l44-189-147-127q-10-9-12.5-20.5T140-571q4-11 12-18t22-9l194-17 75-178q5-12 15.5-18t21.5-6q11 0 21.5 6t15.5 18l75 178 194 17q14 2 22 9t12 18q4 11 1.5 22.5T809-528L662-401l44 189q3 13-2 23.5T690-171q-9 7-21 8t-23-6L480-269Z" />
                    </svg>
                    {{ t('controls.links.suggestFeature') }}
                </a>
                <a href="https://github.com/bruhnn/BD2ModPreview/issues" target="_blank" rel="noopener noreferrer"
                    class="flex gap-2 justify-center items-center group hover:text-slate-100 cursor-pointer transition-colors"
                    :aria-label="t('controls.links.reportIssue')">
                    <svg class="w-5 h-5 text-red-200 transform group-hover:scale-105 transition-all"
                        xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
                        <path
                            d="M480-120q-65 0-120.5-32T272-240h-72q-17 0-28.5-11.5T160-280q0-17 11.5-28.5T200-320h44q-3-20-3.5-40t-.5-40h-40q-17 0-28.5-11.5T160-440q0-17 11.5-28.5T200-480h40q0-20 .5-40t3.5-40h-44q-17 0-28.5-11.5T160-600q0-17 11.5-28.5T200-640h72q14-23 31.5-43t40.5-35l-37-38q-11-11-11-27.5t12-28.5q11-11 28-11t28 11l58 58q28-9 57-9t57 9l60-59q11-11 27.5-11t28.5 12q11 11 11 28t-11 28l-38 38q23 15 41.5 34.5T688-640h72q17 0 28.5 11.5T800-600q0 17-11.5 28.5T760-560h-44q3 20 3.5 40t.5 40h40q17 0 28.5 11.5T800-440q0 17-11.5 28.5T760-400h-40q0 20-.5 40t-3.5 40h44q17 0 28.5 11.5T800-280q0 17-11.5 28.5T760-240h-72q-32 56-87.5 88T480-120Zm0-80q66 0 113-47t47-113v-160q0-66-47-113t-113-47q-66 0-113 47t-47 113v160q0 66 47 113t113 47Zm-40-120h80q17 0 28.5-11.5T560-360q0-17-11.5-28.5T520-400h-80q-17 0-28.5 11.5T400-360q0 17 11.5 28.5T440-320Zm0-160h80q17 0 28.5-11.5T560-520q0-17-11.5-28.5T520-560h-80q-17 0-28.5 11.5T400-520q0 17 11.5 28.5T440-480Zm40 40Z" />
                    </svg>
                    {{ t('controls.links.reportIssue') }}
                </a>
            </div>
        </div>

        <div class="p-4 flex flex-col gap-6 overflow-y-auto scrollbar h-full">
            <!-- Settings -->
            <div class="space-y-4">
                <h4 class="text-sm font-medium text-slate-300 uppercase tracking-wide">{{ t('controls.render.title') }}
                </h4>

                <SwitchGroup>
                    <div class="flex items-center gap-2">
                        <Switch v-model="spineStore.premultipliedAlpha"
                            :class='spineStore.premultipliedAlpha ? "bg-slate-500" : "bg-gray-600"'
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer">
                            <span :class='spineStore.premultipliedAlpha ? "translate-x-6" : "translate-x-1"'
                                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" />
                        </Switch>
                        <SwitchLabel class="mr-4 cursor-pointer select-none">{{ t('controls.render.premultipliedAlpha')
                            }}</SwitchLabel>
                    </div>
                </SwitchGroup>

                <div class="space-y-2">
                    <label class="text-sm font-medium text-slate-300 select-none">{{
                        t('controls.render.backgroundColor') }}</label>
                    <div class="relative flex gap-1">
                        <input type="color" v-model="spineStore.backgroundColor"
                            class="w-full h-10 rounded-lg cursor-pointer border-2 border-slate-600 hover:border-slate-500 transition-colors" />
                        <div
                            class="absolute inset-0 rounded-lg pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent">
                        </div>
                        <button class="p-2 bg-slate-600 rounded-md cursor-pointer"
                            @click="spineStore.setBackgroundColor(defaultBackgroundColor)">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                                fill="#e3e3e3">
                                <path
                                    d="M440-122q-121-15-200.5-105.5T160-440q0-66 26-126.5T260-672l57 57q-38 34-57.5 79T240-440q0 88 56 155.5T440-202v80Zm80 0v-80q87-16 143.5-83T720-440q0-100-70-170t-170-70h-3l44 44-56 56-140-140 140-140 56 56-44 44h3q134 0 227 93t93 227q0 121-79.5 211.5T520-122Z" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="space-y-2">
                    <label class="text-sm font-medium text-slate-300 select-none">{{
                        t('controls.render.backgroundImage') }}</label>
                    <div class="relative flex gap-1">
                        <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden"
                            @change="handleBackgroundImageChange" />

                        <button @click="fileInput?.click()"
                            class="w-full h-10 px-4 bg-slate-700 rounded-md cursor-pointer flex items-center justify-center text-slate-300 hover:bg-slate-600 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px"
                                fill="currentColor" class="mr-2">
                                <path
                                    d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm40-80h480L520-590 380-420l-80-100-60 80Zm-40 80v-560 560Z" />
                            </svg>
                            {{ t('controls.render.chooseImage') }}
                        </button>

                        <button v-if="spineStore.backgroundImage" @click="spineStore.removeBackgroundImage"
                            class="p-2 bg-slate-600 rounded-md cursor-pointer hover:bg-red-400 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                                fill="#e3e3e3">
                                <path
                                    d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Animations -->
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <h4 class="text-sm font-medium text-slate-300 uppercase tracking-wide">{{
                        t('controls.animations.title') }}</h4>
                    <span class="text-xs text-slate-500">{{ t('controls.animations.available', {
                        count:
                            spineStore.animations.length }) }}</span>
                </div>

                <SwitchGroup>
                    <div class="flex items-center gap-2">
                        <Switch v-model="spineStore.loopAnimation"
                            :class='spineStore.loopAnimation ? "bg-slate-500" : "bg-gray-600"'
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer">
                            <span :class='spineStore.loopAnimation ? "translate-x-6" : "translate-x-1"'
                                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" />
                        </Switch>
                        <SwitchLabel class="mr-4 cursor-pointer select-none">{{ t('controls.animations.loopAnimation')
                            }}</SwitchLabel>
                    </div>
                </SwitchGroup>

                <div>
                    <!-- no animations   -->
                    <div v-if="!animationsWithCombined || animationsWithCombined.length === 0"
                        class="flex flex-col items-center justify-center py-2 px-4 text-center">
                        <h3 class="text-sm font-medium text-slate-300">{{ t('controls.animations.noAnimations') }}</h3>
                    </div>

                    <div v-else class="flex flex-col gap-3">
                        <Listbox v-model="spineStore.currentAnimation">
                            <div class="relative flex-1">
                                <ListboxButton
                                    class="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 hover:pl-4 cursor-pointer text-sm font-medium text-slate-200 transition-all duration-200 hover:border-slate-600 hover:bg-slate-700/50 focus:border-slate-500 focus:bg-slate-700/60 focus:outline-none focus:ring-1 focus:ring-slate-600 text-left flex items-center justify-between">
                                    <span>
                                        {{ spineStore.currentAnimation }}
                                    </span>
                                    <svg class="w-6 h-6 text-slate-400 transition-transform ui-open:rotate-180"
                                        xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
                                        <path d="M480-360 280-560h400L480-360Z" />
                                    </svg>
                                </ListboxButton>
                                <transition enter-active-class="transition duration-100 ease-out"
                                    enter-from-class="transform scale-95 opacity-0"
                                    enter-to-class="transform scale-100 opacity-100"
                                    leave-active-class="transition duration-75 ease-out"
                                    leave-from-class="transform scale-100 opacity-100"
                                    leave-to-class="transform scale-95 opacity-0">
                                    <ListboxOptions
                                        class="absolute z-50 mt-1 mb-2 w-full max-h-64 overflow-y-auto scrollbar rounded-xl border border-slate-700/50 bg-slate-800/95 backdrop-blur-sm overflow-hidden text-sm shadow-lg ring-1 ring-slate-700/50 focus:outline-none">
                                        <ListboxOption v-slot="{ active, selected }"
                                            v-for="anim in animationsWithCombined" :key="anim" :value="anim"
                                            as="template">
                                            <li :class="[
                                                active ? 'bg-slate-700/60 text-slate-100' : 'text-slate-200',
                                                'relative cursor-pointer select-none transition-colors duration-150'
                                            ]">
                                                <div @click.prevent="selectAnimation(anim)"
                                                    class="flex items-center justify-between py-2 pl-3">
                                                    <span :class="[
                                                        selected ? 'font-semibold text-slate-100' : 'font-normal text-slate-400',
                                                        'block truncate'
                                                    ]">
                                                        {{ anim }}
                                                    </span>
                                                    <span v-if="selected"
                                                        class="absolute inset-y-0 right-2 flex items-center text-slate-400">
                                                        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 20 20" fill="currentColor">
                                                            <path fill-rule="evenodd"
                                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                clip-rule="evenodd" />
                                                        </svg>
                                                    </span>
                                                </div>
                                            </li>
                                        </ListboxOption>
                                    </ListboxOptions>
                                </transition>
                            </div>
                        </Listbox>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="space-y-4">
                <h4 class="text-sm font-medium text-slate-300 uppercase tracking-wide">{{ t('controls.actions.title') }}
                </h4>
                <div class="grid grid-cols-1 gap-3">
                    <button @click="uiStore.openHistory" class="flex cursor-pointer items-center justify-center gap-2 
       bg-slate-700 hover:bg-slate-600 
       text-slate-300 font-medium py-3 px-4 rounded-xl 
       transition-colors duration-200 shadow-lg text-sm">
                        <svg class="text-slate-300 w-5 h-5" xmlns="http://www.w3.org/2000/svg" height="24px"
                            viewBox="0 -960 960 960" width="24px" fill="currentColor">
                            <path
                                d="M480-120q-138 0-240.5-91.5T122-440h82q14 104 92.5 172T480-200q117 0 198.5-81.5T760-480q0-117-81.5-198.5T480-760q-69 0-129 32t-101 88h110v80H120v-240h80v94q51-64 124.5-99T480-840q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-480q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-120Zm112-192L440-464v-216h80v184l128 128-56 56Z" />
                        </svg>
                        {{ t('controls.actions.viewHistory') }}
                    </button>
                    <button @click="uiStore.openLogs" class="flex cursor-pointer items-center justify-center gap-2 
       bg-slate-700 hover:bg-slate-600 
       text-slate-300 font-medium py-3 px-4 rounded-xl 
       transition-colors duration-200 shadow-lg text-sm">
                        <svg class="text-slate-300 w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"
                            fill="currentColor">
                            <path
                                d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z" />
                        </svg>
                        {{ t('controls.actions.openLogs') }}
                    </button>
                </div>
            </div>

            <div class="space-y-4">
                <h4 class="text-sm font-medium text-slate-300 uppercase tracking-wide">{{
                    t('controls.appSettings.title') }}</h4>

                <div class="space-y-2">
                    <label class="text-xs font-medium text-slate-400 uppercase tracking-wide select-none">{{
                        t('controls.appSettings.language') }}</label>
                    <Listbox v-model="locale">
                        <div class="relative">
                            <ListboxButton
                                class="w-full rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5 hover:pl-3 cursor-pointer text-xs text-slate-200 transition-all duration-200 hover:border-slate-600 hover:bg-slate-700/50 focus:border-slate-500 focus:bg-slate-700/60 focus:outline-none focus:ring-1 focus:ring-slate-600 text-left flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <span>{{ displayLanguages[locale] }}</span>
                                </div>
                                <svg class="w-5 h-5 text-slate-400 transition-transform ui-open:rotate-180"
                                    xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
                                    <path d="M480-360 280-560h400L480-360Z" />
                                </svg>
                            </ListboxButton>
                            <transition enter-active-class="transition duration-100 ease-out"
                                enter-from-class="transform scale-95 opacity-0"
                                enter-to-class="transform scale-100 opacity-100"
                                leave-active-class="transition duration-75 ease-out"
                                leave-from-class="transform scale-100 opacity-100"
                                leave-to-class="transform scale-95 opacity-0">
                                <ListboxOptions
                                    class="absolute w-full z-50 mt-1 rounded-lg border border-slate-700/50 bg-slate-800/95 backdrop-blur-sm overflow-hidden text-xs shadow-lg ring-1 ring-slate-700/50 focus:outline-none">
                                    <ListboxOption v-slot="{ active, selected }" v-for="language in availableLocales"
                                        :key="language" :value="language" as="template">
                                        <li :class="[
                                            active ? 'bg-slate-700/60 text-slate-100' : 'text-slate-200',
                                            'relative cursor-pointer select-none transition-colors duration-150'
                                        ]">
                                            <div class="flex items-center gap-2 py-2 pl-3 pr-9">
                                                <span class="font-mono">{{ language }}</span>
                                                <span :class="[
                                                    selected ? 'font-semibold text-slate-100' : 'font-normal',
                                                    'block truncate'
                                                ]">
                                                    {{ displayLanguages[language] }}
                                                </span>
                                                <span v-if="selected"
                                                    class="absolute inset-y-0 right-2 flex items-center text-slate-400">
                                                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 20 20" fill="currentColor">
                                                        <path fill-rule="evenodd"
                                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                            clip-rule="evenodd" />
                                                    </svg>
                                                </span>
                                            </div>
                                        </li>
                                    </ListboxOption>
                                </ListboxOptions>
                            </transition>
                        </div>
                    </Listbox>
                </div>
            </div>

            <p class="text-gray-400 text-medium text-xs text-center mt-auto">
                {{ t('controls.version', { version: appVersion }) }}
            </p>
        </div>
    </div>
</template>

<style scoped></style>
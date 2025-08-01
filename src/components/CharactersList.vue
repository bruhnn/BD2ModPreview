<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RadioGroup, RadioGroupOption } from '@headlessui/vue'

const emit = defineEmits([
    "character-selected"
])

const characters = ref(null)
const searchValue = ref('');
const typeSelected = ref("standing")

const characterTypeMap = {
    standing: { key: 'standing', image: 'character_image' },
    cutscene: { key: 'cutscene', image: 'skill_preview_image' },
    dating: { key: 'dating', image: 'character_image' },
}

const filteredCharacters = computed(() => {
    if (!characters.value) {
        return [];
    }

    const config = characterTypeMap[typeSelected.value];
    
    if (!config) {
        return [];
    }

    let filtered = characters.value.filter(char => char[config.key] !== null);

    if (searchValue.value.trim() !== '') {
        const searchChar = searchValue.value.toLowerCase();
        filtered = filtered.filter(char =>
            // char.character.toLowerCase().includes(searchChar) ||
            // char.costume.toLowerCase().includes(searchChar) || 
            `${char.character.toLowerCase()} ${char.costume.toLowerCase()}`.includes(searchChar)
        );
    }

    return filtered;
})

function characterClicked(char: Object) {
    emit("character-selected", char, typeSelected.value)
}

function getThumbnail(character: any) {
    const imageKey = characterTypeMap[typeSelected.value].image;
    return character[imageKey];
}

async function loadCharacters() {
    try {
        const response = await fetch('/characters.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        characters.value = (await response.json()).characters;
        console.log("Characters loaded:", characters.value);
    } catch (error) {
        console.error("Failed to load characters from public folder:", error);
    }
}

onMounted(() => {
    if (!characters.value) {loadCharacters()};
})
</script>

<template>
    <div class="h-full flex flex-col bg-slate-900 text-slate-200">
        <div class="flex gap-2 flex-col mb-2 flex-shrink-0">
            <RadioGroup v-model="typeSelected">
                <div class="flex space-x-1 justify-evenly bg-slate-800/60 px-2 py-4 gap-1 flex-shrink-0">
                    <RadioGroupOption v-for="tab in ['standing', 'cutscene', 'dating']" :key="tab" :value="tab"
                        v-slot="{ checked }" class="w-full">
                        <button
                            class="active:outline-none hover:bg-slate-700/70 cursor-pointer active:ring-0 w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-slate-300 ring-white ring-opacity-60 ring-offset-2 ring-offset-slate-400 focus:outline-none focus:ring-2"
                            :class="{
                                'active:ring-0 bg-slate-700 shadow text-white text-slate-400 hover:bg-slate-800/[0.5]': checked
                            }">
                            {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
                        </button>
                    </RadioGroupOption>
                </div>
            </RadioGroup>
        </div>

        <div class="flex flex-col flex-1 min-h-0 px-2 gap-4">
            <div>
                <div class="relative flex-shrink-0">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                            fill="currentColor">
                            <path
                                d="M380-320q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l224 224q11 11 11 28t-11 28q-11 11-28 11t-28-11L532-372q-30 24-69 38t-83 14Zm0-80q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z" />
                        </svg>
                    </div>
                    <input type="search" v-model="searchValue" placeholder="Search characters..."
                        class="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:bg-slate-800">
                </div>
                <div class="mt-2 p-2 bg-slate-800/40 border border-slate-700/30 rounded-md">
                    <p class="text-xs text-slate-400 flex items-center">
                        <svg class="w-4 h-4 mr-1.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Character assets are loaded from GitHub repository
                    </p>
                </div>
            </div>

            <div class="overflow-y-auto scrollbar flex-1 min-h-0 pr-1 focus:outline-none select-none pb-4">
                <div v-if="!characters" class="text-center text-slate-400">
                    Loading characters...
                </div>

                <div v-else-if="filteredCharacters.length === 0" class="text-center text-slate-400">
                    No characters found.
                </div>

                <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div v-for="character in filteredCharacters" :key="character.id"
                        @click="characterClicked(character)"
                        class="group relative cursor-pointer overflow-hidden rounded-lg bg-slate-800 shadow-md transition-all duration-300 ease-in-out hover:shadow-xl">

                        <img loading="lazy" :src="getThumbnail(character)" :alt="character.character"
                            class="flex-1 object-cover transition-transform duration-300 ease-in-out group-hover:scale-115">

                        <div
                            class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                            <h3 class="font-bold text-white">{{ character.character }}</h3>
                            <p class="text-sm text-slate-300">{{ character.costume }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
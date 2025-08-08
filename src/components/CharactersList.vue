<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RadioGroup, RadioGroupOption } from '@headlessui/vue'
import { useLogger } from '../composables/useLogger';
import { useSpineStore } from '../stores/spine';
import { useCharactersStore } from '../stores/characters';
import NoInternetState from './NoInternetState.vue';
import { useNetworkStatus } from '../composables/useNetworkStatus';
import { Character } from '../types/character';
import { useI18n } from 'vue-i18n';

const { t } = useI18n()

const {
    isConnected,
    checkConnection
} = useNetworkStatus()

const props = defineProps<{
    visible?: boolean
}>()

const visibleOnce = computed(() => props.visible || alreadyOpened.value);
watch(() => props.visible, (v) => {
    if (v) alreadyOpened.value = true;
});
const alreadyOpened = ref(false);

const { logMessage } = useLogger()

const spineStore = useSpineStore()
const charactersStore = useCharactersStore()

const typeSelected = ref("standing");
const searchValue = ref('');
const sortValue = ref('newest'); // 'oldest', 'newest', 'a-z', 'z-a'

const characterTypeMap = {
    standing: { key: 'standing', image: 'character_image' },
    cutscene: { key: 'cutscene', image: 'skill_preview_image' },
    dating: { key: 'dating_id', image: 'character_image' },
}

const filteredCharacters = computed(() => {
    const config = characterTypeMap[typeSelected.value];

    if (!config) {
        return [];
    }

    if (!charactersStore.characters) {
        logMessage('Characters not loaded yet', 'error');
        return [];
    }

    let filtered = charactersStore.characters.filter(char => char[config.key]);

    if (searchValue.value.trim() !== '') {
        const searchChar = searchValue.value.toLowerCase();
        filtered = filtered.filter(char =>
            // char.character.toLowerCase().includes(searchChar) ||
            // char.costume.toLowerCase().includes(searchChar) || 
            `${char.character.toLowerCase()} ${char.costume.toLowerCase()}`.includes(searchChar)
        );
    }

    if (sortValue.value === 'oldest') {
        filtered.sort((a, b) => {
            const aDate = a.release_date ? new Date(a.release_date) : new Date('9999-12-31');
            const bDate = b.release_date ? new Date(b.release_date) : new Date('9999-12-31');
            return aDate - bDate;
        });
    } else if (sortValue.value === 'newest') {
        filtered.sort((a, b) => {
            const aDate = a.release_date ? new Date(a.release_date) : new Date('1900-01-01');
            const bDate = b.release_date ? new Date(b.release_date) : new Date('1900-01-01');
            return bDate - aDate;
        });
    } else if (sortValue.value === 'a-z') {
        filtered.sort((a, b) => a.character.localeCompare(b.character));
    } else if (sortValue.value === 'z-a') {
        filtered.sort((a, b) => b.character.localeCompare(a.character));
    }

    return filtered;
})

const JSDELIVR_BASE_URL = "https://cdn.jsdelivr.net/gh/bruhnn/Brown-Dust-2-Asset@master/spine"
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/bruhnn/Brown-Dust-2-Asset/refs/heads/master/spine'
const ENDPOINTS = {
    standing: 'char',
    cutscene: 'cutscenes',
    dating: 'illust/illust_dating'
} as const

function getCharacterUrl(character: Character, type: string): { skelUrl: string; atlasUrl: string, skelUrlFallback?: string, atlasUrlFallback?: string } | null {
    const endpoint = ENDPOINTS[type]

    let skelUrl;
    let atlasUrl;
    let filename: string | null = null;

    switch (type) {
        case 'standing':
            filename = `char${character.id}/char${character.id}`
            break
        case 'cutscene':
            filename = `cutscene_char${character.id}/cutscene_char${character.id}`
            break
        case 'dating':
            filename = `illust_dating${character.dating_id}/illust_dating${character.dating_id}`
            break
    }

    if (!filename) {
        logMessage(`Invalid Character Type: ${type}`, "error")
        return null
    }

    skelUrl = `${filename}.skel`
    atlasUrl = `${filename}.atlas`

    if (!skelUrl || !atlasUrl) {
        return null
    }

    return {
        skelUrl: `${JSDELIVR_BASE_URL}/${endpoint}/${skelUrl}`,
        atlasUrl: `${JSDELIVR_BASE_URL}/${endpoint}/${atlasUrl}`,
        skelUrlFallback: `${GITHUB_BASE_URL}/${endpoint}/${skelUrl}`,
        atlasUrlFallback: `${GITHUB_BASE_URL}/${endpoint}/${atlasUrl}`
    }
}

function characterClicked(char: Character) {
    const urls = getCharacterUrl(char, typeSelected.value)

    if (!urls) {
        logMessage(`Invalid Character Data. Could not find ${typeSelected.value} data for the selected character.`, "error")
        return
    }

    spineStore.setSpineUrl(
        urls.skelUrl,
        urls.atlasUrl,
        urls.skelUrlFallback,
        urls.atlasUrlFallback,
    )
}

function getThumbnail(character: any) {
    const imageKey = characterTypeMap[typeSelected.value];
    const baseUrl = "https://cdn.jsdelivr.net/gh/bruhnn/Brown-Dust-2-Asset@master/ui/illust";

    if (!imageKey || !character[imageKey.image]) {
        logMessage(`Invalid Character Data. Could not find image for ${typeSelected.value} type.`, "error")
        return ''
    }
    // standind and dating show the character image
    // cutscene shows the skill preview image
    if (imageKey.key === "standing" || imageKey.key === "dating_id") {
        return `${baseUrl}/illust_inven_char/${character[imageKey.image]}`
    } else if (imageKey.key === "cutscene") {
        return `${baseUrl}/illust_skill_char/${character[imageKey.image]}`
    }
}

onMounted(async () => {
    await checkConnection()
})
</script>

<template>
  <div class="h-full flex flex-col bg-slate-900 text-slate-200">
    <div class="flex gap-2 flex-col mb-2 flex-shrink-0">
      <RadioGroup v-model="typeSelected">
        <div class="flex space-x-1 justify-evenly bg-slate-800/60 px-2 py-4 gap-1 flex-shrink-0">
          <RadioGroupOption v-for="tab in ['standing', 'cutscene', 'dating']" :key="tab" :value="tab" v-slot="{ checked }" class="w-full">
            <button
              class="active:outline-none hover:bg-slate-700/70 cursor-pointer active:ring-0 w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-slate-300 ring-white ring-opacity-60 ring-offset-2 ring-offset-slate-400 focus:outline-none focus:ring-2"
              :class="{
                'active:ring-0 bg-slate-700 shadow text-white text-slate-400 hover:bg-slate-800/[0.5]': checked,
              }"
            >
              {{ t(`characterList.tabs.${tab}`) }}
            </button>
          </RadioGroupOption>
        </div>
      </RadioGroup>
    </div>

    <div class="flex flex-col flex-1 min-h-0 px-2 gap-4">
      <!-- header -->
      <div>
        <div class="flex items-center justify-between gap-2">
          <div class="relative flex-shrink-0 flex-1">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                <path
                  d="M380-320q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l224 224q11 11 11 28t-11 28q-11 11-28 11t-28-11L532-372q-30 24-69 38t-83 14Zm0-80q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"
                />
              </svg>
            </div>
            <input
              :disabled="!isConnected"
              type="search"
              v-model="searchValue"
              :placeholder="t('characterList.searchPlaceholder')"
              class="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:bg-slate-800"
            />
          </div>
          <div class="relative">
            <select
              v-model="sortValue"
              :disabled="!isConnected"
              class="appearance-none bg-slate-800/80 border border-slate-700/50 rounded-lg text-slate-200 px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:bg-slate-800 cursor-pointer min-w-[120px]"
            >
              <option value="newest">{{ t('characterList.sort.newest') }}</option>
              <option value="oldest">{{ t('characterList.sort.oldest') }}</option>
              <option value="a-z">{{ t('characterList.sort.a_z') }}</option>
              <option value="z-a">{{ t('characterList.sort.z_a') }}</option>
            </select>
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor" class="text-slate-400">
                <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z" />
              </svg>
            </div>
          </div>
        </div>
        <div class="mt-2 p-2 bg-slate-800/40 border border-slate-700/30 rounded-md">
          <p class="text-xs text-slate-400 flex items-center">
            <svg class="w-4 h-4 mr-1.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ t('characterList.information') }}
          </p>
        </div>
      </div>

      <div class="overflow-y-auto scrollbar flex-1 min-h-0 pr-1 focus:outline-none select-none pb-4">
        <NoInternetState v-if="!isConnected" @check-connection="checkConnection" />

        <div v-else-if="!charactersStore.characters" class="text-center text-slate-400">
          {{ t('characterList.loadingCharacters') }}
        </div>

        <div v-else-if="filteredCharacters.length === 0" class="text-center text-slate-400">
          {{ t('characterList.noCharactersFound') }}
        </div>

        <div v-else class="relative">
          <Transition enter-active-class="transition-opacity duration-300 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-opacity duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
            <div
              v-if="spineStore.isPlayerLoading"
              class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center"
            >
              <div class="flex flex-col items-center gap-3 text-white">
                <div class="animate-spin rounded-full h-8 w-8 border-2 border-white/70 border-t-transparent"></div>
                <span class="text-sm font-medium tracking-wide">{{ t('characterList.loadingCharacter') }}</span>
              </div>
            </div>
          </Transition>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div
              v-for="character in filteredCharacters"
              :key="character.id"
              @click="characterClicked(character)"
              class="group relative cursor-pointer overflow-hidden rounded-lg bg-slate-800 shadow-md transition-all duration-300 ease-in-out hover:shadow-xl"
            >
              <img
                v-if="visibleOnce"
                loading="lazy"
                :src="getThumbnail(character)"
                :alt="character.character"
                class="flex-1 object-cover transition-transform duration-300 ease-in-out group-hover:scale-115"
              />

              <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                <h3 class="font-bold text-white">{{ character.character }}</h3>
                <p class="text-sm text-slate-300">{{ character.costume }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
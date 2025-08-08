<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { getMatches } from '@tauri-apps/plugin-cli'
import { useLogger } from "./composables/useLogger"
import Logging from "./components/modals/Logging.vue"
import SpinePlayer from "./components/SpinePlayer.vue"
import CharactersList from "./components/CharactersList.vue"
import History from "./components/modals/History.vue"

import { useSpineStore } from "./stores/spine"
import HomePage from "./views/HomePage.vue"

import { saveWindowState, StateFlags } from '@tauri-apps/plugin-window-state';
import { useUIStore } from "./stores/ui"
import { useCharactersStore } from "./stores/characters"
import SidebarControls from "./components/Controls/SidebarControls.vue"
import FloatingControls from "./components/Controls/FloatingControls.vue"
import { useI18n } from "vue-i18n"

saveWindowState(StateFlags.ALL);

const { logMessage, clearLogs } = useLogger()
const spineStore = useSpineStore()
const uiStore = useUIStore()
const charactersStore = useCharactersStore()

// reactive
const showCharactersList = ref(false)

let eventListeners: Record<string, UnlistenFn | null> = {
  dragDrop: null
}

function toggleCharactersList(): void {
  showCharactersList.value = !showCharactersList.value
}

// functions
async function initializeDragAndDrop(): Promise<void> {
  try {
    eventListeners.dragDrop = await listen<DragDropPayload>('tauri://drag-drop', (event) => {
      const droppedFolder = event.payload.paths[0]
      if (droppedFolder) {
        logMessage(`Folder dropped: ${droppedFolder}`)
        spineStore.setSpineFolder(droppedFolder)
      }
    })

    logMessage('Drag and drop listener initialized')
  } catch (error) {
    logMessage(`Failed to initialize drag and drop: ${error}`, 'error')
  }
}

async function loadFromCli(): Promise<void> {
  try {
    const matches = await getMatches()
    const pathArg = matches.args.path?.value

    if (typeof pathArg === 'string' && pathArg) {
      logMessage(`CLI path argument found: ${pathArg}`);
      spineStore.setSpineFolder(pathArg);
    } else {
      logMessage('No CLI path argument provided')
    }
  } catch (error) {
    logMessage(`Error processing CLI arguments: ${error}`, 'error')
  }
}

function cleanupEventListeners(): void {
  Object.values(eventListeners).forEach(unlisten => unlisten?.())
  eventListeners = {
    dragDrop: null
  }
}

const { locale } = useI18n()

onMounted(async () => {
  clearLogs()
  logMessage('Application starting...')

  await Promise.all([
    loadFromCli(),
    initializeDragAndDrop(),

    charactersStore.loadCharacters()
  ])

  logMessage('Application initialized successfully.', "success");

  locale.value = uiStore.language
})

onUnmounted(async () => {
  cleanupEventListeners()
  logMessage('Application cleaned up')
})
</script>

<template>
  <div class="text-white w-screen h-screen flex relative bg-slate-900 overflow-hidden">
    <!-- mmodals -->
    <Logging :show="uiStore.showLogs" @close="uiStore.closeLogs" />
    <History :show="uiStore.showHistory" @close="uiStore.closeHistory" />

    <div class="fixed top-0 left-0 h-full z-30 transition-transform duration-200 ease-out" :class="{
      'translate-x-0': uiStore.controlsPosition === 'sidebar' && uiStore.showControls,
      '-translate-x-full': !(uiStore.controlsPosition === 'sidebar' && uiStore.showControls)
    }">
      <SidebarControls />
    </div>

    <div
      class="flex-1 min-w-0 flex align-center items-center justify-center relative text-gray-400 transition-all duration-200 ease-out overflow-hidden main-content-area"
      :class="{
        'ml-96': uiStore.showControls && uiStore.controlsPosition === 'sidebar',
        'mr-[40%]': showCharactersList
      }">

      <!-- controsl button -->

      <div v-if="!spineStore.source && !uiStore.showControls" class="absolute top-10 left-10 z-50">
        <button @click="uiStore.toggleControls"
          class="p-3 bg-slate-800/40 cursor-pointer hover:bg-slate-700/80 rounded-full border border-slate-600/20 backdrop-blur-sm transition-all duration-200 text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          aria-label="Open settings">
          <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
            <path
              d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z" />
          </svg>
        </button>
      </div>

      <!-- floating controls -->
      <FloatingControls v-if="uiStore.controlsPosition === 'floating'" />

      <!-- characters List btn -->
      <div class="absolute top-4 right-0 z-40">
        <button @click="toggleCharactersList"
          class="opacity-60 font-mono text-center flex items-center rounded-l-xl border-l border-bt border-slate-700/80 bg-slate-700/90 backdrop-blur-sm py-1.5 px-2 text-slate-300 hover:text-white hover:bg-slate-700/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 transition-all duration-300 cursor-pointer hover:py-2 hover:opacity-100"
          style="writing-mode: vertical-lr; text-orientation: upright;letter-spacing: -0.2em;"
          aria-label="Toggle characters list">
          {{ 'CHARACTERS' }}
        </button>
      </div>


      <div class="w-full h-full max-w-full overflow-hidden">
        <!-- doesnt have source; show home page -->
        <HomePage v-if="!spineStore.source" />

        <!-- spine playe -->
        <div v-else class="relative w-full h-full">
          <div class="absolute top-0 left-0 z-50 flex flex-col gap-1 items-start">
            <button v-if="true" @click="spineStore.clearSource"
              class="flex text-xs font-bold items-center gap-2 px-3 py-2 bg-slate-800/30 hover:bg-slate-700/80 rounded-br-lg border-b border-r cursor-pointer border-slate-600/50  text-slate-300 hover:text-white backdrop-blur-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              aria-label="Go back to home">
              <svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px"
                fill="currentColor">
                <path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z" />
              </svg>
              {{ $t('app.backToHome') }}
            </button>

            <button v-if="!uiStore.showControls" @click="uiStore.toggleControls" class="w-auto cursor-pointer mt-0 rounded-br-md rounded-tr-md flex items-center gap-2 px-3 py-2 text-xs font-medium 
           bg-slate-800/50 text-slate-200
           hover:bg-slate-700/80 hover:text-white
           border border-slate-600/50
           backdrop-blur-sm shadow-sm
           transition-all duration-200
           focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500" aria-label="Toggle settings">
              <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
                <path
                  d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z" />
              </svg>
              {{ $t('app.toggleControls') }}
            </button>
          </div>

          <!-- <QuickControls /> -->

          <SpinePlayer />
        </div>
      </div>
    </div>

    <!-- characters List -->
    <div
      class="fixed top-0 right-0 h-full w-2/5 bg-slate-900 border-l border-slate-700/50 transition-transform duration-200 ease-out z-20"
      :class="{
        'translate-x-0': showCharactersList,
        'translate-x-full': !showCharactersList
      }">
      <CharactersList :visible="showCharactersList" />
    </div>
  </div>
</template>

<style>
.scrollbar::-webkit-scrollbar {
  width: 4px;
}

.scrollbar::-webkit-scrollbar-track {
  background: #1e293b;
  border-radius: 4px;
}

.scrollbar::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 4px;
}

.scrollbar::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

.main-content-area {
  will-change: margin-left, margin-right;
}

.transition-transform {
  backface-visibility: hidden;
  transform: translateZ(0);
}
</style>
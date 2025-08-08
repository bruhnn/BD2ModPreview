<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from 'vue';
import { useSpinePlayer } from '../composables/useSpinePlayer';
import { useSpineStore } from '../stores/spine';
import SpineError from './SpineError.vue';
import { useLogger } from '../composables/useLogger';
import { openPath } from '@tauri-apps/plugin-opener';


const playerContainer = useTemplateRef("player-container");

const { logMessage } = useLogger()

const spineStore = useSpineStore();

const {
  resetCameraToDefault,
  reloadCurrentSpine,
  destroyPlayer,
  downloadSkeletonState,
  handleSource,
  currentSource,
  error: spineError } = useSpinePlayer(playerContainer)

const CAMERA_RESET_KEY = 'F';

function handleKeydown(event: KeyboardEvent): void {
  if (event.key.toLowerCase() === CAMERA_RESET_KEY.toLowerCase()) {
    resetCameraToDefault();
  }
}

// onMounted(async () => {
//   if (spineStore.source) {
//     if (!spineStore.source) {
//       logMessage("No spineStore.source set. Can not load.", "warning");
//       return;
//     }

//     await handleSource(spineStore.source);
//   }
// });

onUnmounted(async () => {
  window.removeEventListener("keydown", handleKeydown);
  await destroyPlayer();
  spineStore.setIsPlayerLoading(false)
});

async function handleOpenFolder() {
  if (!currentSource.value) {
    logMessage("No current source to open folder for.", "warning");
    return;
  }

  if (currentSource.value.type !== "folder" || (currentSource.value.type === 'folder' && !currentSource.value?.path)) {
    logMessage("Current source is not a folder is not set or path is invalid.", "warning");
    return;
  }

  logMessage(`Opening folder: ${currentSource.value.path}`, "info");

  await openPath(currentSource.value.path);
}

</script>

<template>
  <div class="w-full h-full" @keydown="handleKeydown">
    
    <div v-if="downloadSkeletonState.isDownloading"
      class="flex flex-col items-center justify-center align-center w-full h-full">
      <h2 class="text-lg font-bold text-slate-300 mb-4">Downloading Skeleton...</h2>
      <div class="w-64 h-2.5 bg-gray-700 rounded-full overflow-hidden">
        <div :style="{ width: `${downloadSkeletonState.downloadProgress}%` }"
          class="h-full bg-slate-500 transition-all duration-300"></div>
      </div>
      <p class="text-sm text-slate-300 mt-2">{{ downloadSkeletonState.downloadProgress.toFixed(2) }}%</p>
    </div>

    <div v-else-if="spineError" class="text-white flex w-full h-full justify-center items-center">
      <SpineError 
      :title="spineError.title" 
      :message="spineError.message" 
      :retryable="spineError.showRetry"
      :details="spineError.details" 
      :failedAssets="spineError?.failedAssets"
      :showOpenFolder="currentSource?.type === 'folder'"

      @retry="reloadCurrentSpine" 
      @open-folder="handleOpenFolder">
        <template v-if="spineError.actionLabel && spineError.actionCallback" #actionButton>
          <button @click="spineError.actionCallback"
            class="w-full px-4 py-2.5 cursor-pointer bg-slate-800/30 hover:bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-300 hover:text-white transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 backdrop-blur-sm text-sm">
            {{ spineError.actionLabel }}
          </button>
        </template>
      </SpineError>
    </div>

    <div v-else ref="player-container" id="player-container" tabindex="0" class="w-full h-full" />
  </div>
</template>

<style scoped>
#player-container {
  outline: none;
}
</style>

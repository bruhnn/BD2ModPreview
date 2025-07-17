<script setup lang="ts">
import { ref, onMounted, onUnmounted, useTemplateRef, watchEffect, watch, reactive, computed } from "vue"
import { TransitionChild, TransitionRoot } from "@headlessui/vue"
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { invoke } from "@tauri-apps/api/core"
import { getMatches } from '@tauri-apps/plugin-cli'
import { open } from '@tauri-apps/plugin-dialog'
import { useLogger } from "./logger"
import Logging from "./components/logging.vue"
import SpinePlayer from "./components/SpinePlayer.vue"
import SelectFolder from "./components/SelectFolder.vue"
import SpineControls from "./components/SpineControls.vue"
import CharactersList from "./components/CharactersList.vue"
import Error, { SpineError } from "./components/Error.vue"

// types
interface DragDropPayload {
  paths: string[]
}

interface DownloadProgressPayload {
  bytesDownloaded: number
  totalBytes: number
  destinationPath: string
}

interface DownloadFinishedPayload {
  folderPath: string
}

interface Character {
  standing?: { skeleton: string; atlas: string }
  cutscene?: { skeleton: string; atlas: string }
  dating?: { skeleton: string; atlas: string }
}

type CharacterType = 'standing' | 'cutscene' | 'dating'

interface SpineConfig {
  backgroundColor: string
  backgroundImage: string | null
  premultipliedAlpha: boolean,
  loopAnimation: boolean
}

interface LoadSpineOptions {
  path?: string
  skel_url?: string
  atlas_url?: string
}

const DEFAULT_CONFIG = {
  PREMULTIPLIED_ALPHA: false,
  BACKGROUND_COLOR:"#0F172A"
}

const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/bruhnn/Brown-Dust-2-Asset/refs/heads/master/spine'
const GITHUB_ENDPOINTS = {
  standing: 'char',
  cutscene: 'cutscenes',
  dating: 'illust/illust_dating'
} as const

// eactive
const spineError = ref<SpineError | null>(null)
const showLogs = ref(false)
const showControls = ref(false)
const showFolderSelection = ref(false)
const showCharactersList = ref(false)
const isDownloadingSkeleton = ref(false)
const downloadProgress = ref(0)
const currentFolderPath = ref<string | null>(null)

// Spine config
const spineConfig = reactive<SpineConfig>({
  backgroundColor: DEFAULT_CONFIG.BACKGROUND_COLOR,
  backgroundImage: null,
  premultipliedAlpha: getStoredBoolean("PREMULTIPLIED_ALPHA", DEFAULT_CONFIG.PREMULTIPLIED_ALPHA),
  loopAnimation: true,
})

const spinePlayer = useTemplateRef("spinePlayer")
const spineAnimations = ref<string[]>([])
const spineCurrentAnimation = ref<string>('')

let eventListeners: Record<string, UnlistenFn | null> = {
  dragDrop: null,
  downloadStarted: null,
  downloadProgress: null,
  downloadFinished: null
}

// Composables
const { logMessage } = useLogger()

const hasDownloadError = computed(() => spineError.value?.type === 'MissingSkeletonOrJson')
const downloadProgressPercentage = computed(() => Math.round(downloadProgress.value))

function getStoredBoolean(key: string, defaultValue: boolean): boolean {
  const stored = localStorage.getItem(key)
  return stored !== null ? stored === 'true' : defaultValue
}

function setStoredBoolean(key: string, value: boolean): void {
  localStorage.setItem(key, String(value))
}

function validatePath(path: string): boolean {
  return Boolean(path?.trim())
}

function createSpineError(type: string, title: string, message: string): SpineError {
  return { type, title, message }
}

function buildCharacterUrls(character: Character, type: CharacterType): { skel_url: string; atlas_url: string } | null {
  const endpoint = GITHUB_ENDPOINTS[type]
  let characterData: { skeleton: string; atlas: string } | undefined

  switch (type) {
    case 'standing':
      characterData = character.standing
      break
    case 'cutscene':
      characterData = character.cutscene
      break
    case 'dating':
      characterData = character.dating
      break
  }

  if (!characterData?.skeleton || !characterData?.atlas) {
    return null
  }

  return {
    skel_url: `${GITHUB_BASE_URL}/${endpoint}/${characterData.skeleton}`,
    atlas_url: `${GITHUB_BASE_URL}/${endpoint}/${characterData.atlas}`
  }
}

function handleOnlineCharacter(character: Character, type: CharacterType): void {
  const urls = buildCharacterUrls(character, type)
  
  if (!urls) {
    const error = createSpineError(
      'InvalidCharacterData',
      'Invalid Character Data',
      `Could not find ${type} data for the selected character.`
    )
    onSpineError(error)
    return
  }

  logMessage(`Loading ${type} character from online assets`, 'info')
  resetErrorState()
  loadSpineAssets(urls)
}

function resetErrorState(): void {
  spineError.value = null
  showFolderSelection.value = false
}

function resetDownloadState(): void {
  isDownloadingSkeleton.value = false
  downloadProgress.value = 0
}

function loadSpineAssets(options: LoadSpineOptions): void {
  if (!spinePlayer.value) {
    logMessage('Spine player not available', 'error')
    return
  }

  spinePlayer.value.loadSpine(options)
}

function setFolderPath(path: string): void {
  if (!validatePath(path)) {
    logMessage('Invalid folder path provided', 'error')
    return
  }

  currentFolderPath.value = path
  resetErrorState()
  loadSpineAssets({ path })
  logMessage(`Folder path set to: ${path}`)
}

// Event handlers
function handleAnimationsLoaded(animations: string[]): void {
  spineAnimations.value = animations
  logMessage(`Loaded ${animations.length} animations: ${animations.join(', ')}`, 'info')
}

function onSpineSuccess(currentAnimation: string): void {
  spineError.value = null
  spineCurrentAnimation.value = currentAnimation
  logMessage('Spine animation loaded successfully', 'success')
}

function onSpineError(error: SpineError): void {
  logMessage(`Spine error: ${JSON.stringify(error)}`, 'error')

  const errorMap: Record<string, { title: string; message: string }> = {
    DirectoryNotFound: {
      title: 'Directory Not Found',
      message: 'The selected folder was not found.'
    },
    MissingSkeletonOrJson: {
      title: 'Missing Skeleton File',
      message: 'The selected folder is missing the required skeleton .JSON or .SKEL file.'
    },
    InvalidCharacterData: {
      title: 'Invalid Character Data',
      message: 'The selected character data is incomplete or invalid.'
    },
    DownloadError: {
      title: 'Download Failed',
      message: 'Failed to download the skeleton file. Please try again or check your internet connection.'
    }
  }

  const errorInfo = errorMap[error.type] || {
    title: error.title || 'An Unexpected Error Occurred',
    message: error.message || 'Could not load the Spine animation. Check the logs for more details.'
  }

  spineError.value = createSpineError(error.type, errorInfo.title, errorInfo.message)
}

// UI
function handleShowLogs(): void {
  showControls.value = false
  showLogs.value = true
}

async function handleSelectFolder(): Promise<void> {
  try {
    const selectedPath = await open({
      directory: true,
      multiple: false
    })
    
    if (typeof selectedPath === 'string' && selectedPath) {
      setFolderPath(selectedPath)
    }
  } catch (error) {
    logMessage(`Error opening folder dialog: ${error}`, 'error')
  }
}

function toggleControls(): void {
  showControls.value = !showControls.value
}

function toggleCharactersList(): void {
  showCharactersList.value = !showCharactersList.value
}

// Download functions
async function downloadMissingSkeleton(): Promise<void> {
  if (!currentFolderPath.value) {
    logMessage('No folder path available for skeleton download', 'error')
    return
  }

  try {
    isDownloadingSkeleton.value = true
    downloadProgress.value = 0
    logMessage(`Starting skeleton download for: ${currentFolderPath.value}`)

    await invoke('download_missing_skeleton', { folderPath: currentFolderPath.value })
    
    logMessage('Skeleton download completed successfully')
  } catch (error) {
    resetDownloadState()
    logMessage(`Download failed: ${error}`, 'error')

    const downloadError = createSpineError(
      'DownloadError',
      'Download Failed',
      'Failed to download the skeleton file. Please try again or check your internet connection.'
    )
    onSpineError(downloadError)
  }
}

// functions
async function initializeDragAndDrop(): Promise<void> {
  try {
    eventListeners.dragDrop = await listen<DragDropPayload>('tauri://drag-drop', (event) => {
      const droppedPath = event.payload.paths[0]
      if (droppedPath) {
        logMessage(`Folder dropped: ${droppedPath}`)
        setFolderPath(droppedPath)
      }
    })

    logMessage('Drag and drop listener initialized')
  } catch (error) {
    logMessage(`Failed to initialize drag and drop: ${error}`, 'error')
  }
}

async function initializeDownloadListeners(): Promise<void> {
  try {
    eventListeners.downloadStarted = await listen('download-started', () => {
      logMessage('Download started')
      downloadProgress.value = 0
    })

    eventListeners.downloadProgress = await listen<DownloadProgressPayload>('download-progress', (event) => {
      const { bytesDownloaded, totalBytes } = event.payload
      downloadProgress.value = (bytesDownloaded / totalBytes) * 100
    })

    eventListeners.downloadFinished = await listen<DownloadFinishedPayload>('download-finished', () => {
      logMessage('Download finished successfully')
      resetDownloadState()    
      downloadProgress.value = 100
      spineError.value = null
      loadSpineAssets({
        path: currentFolderPath.value
      })
    })

    logMessage('Download event listeners initialized')
  } catch (error) {
    logMessage(`Failed to setup download listeners: ${error}`, 'error')
  }
}

async function loadFromCli(): Promise<void> {
  try {
    const matches = await getMatches()
    const pathArg = matches.args.path?.value

    if (typeof pathArg === 'string' && pathArg) {
      logMessage(`CLI path argument found: ${pathArg}`)
      setFolderPath(pathArg)
    } else {
      logMessage('No CLI path argument provided')
      showFolderSelection.value = true
    }
  } catch (error) {
    logMessage(`Error processing CLI arguments: ${error}`, 'error')
    showFolderSelection.value = true
  }
}

function cleanupEventListeners(): void {
  Object.values(eventListeners).forEach(unlisten => unlisten?.())
  eventListeners = {
    dragDrop: null,
    downloadStarted: null,
    downloadProgress: null,
    downloadFinished: null
  }
}

watch(spineCurrentAnimation, (animationName: string) => {
  if (animationName && spinePlayer.value) {
    spinePlayer.value.playAnimation(animationName)
  }
}, { immediate: false })

watchEffect(() => {
  setStoredBoolean("PREMULTIPLIED_ALPHA", spineConfig.premultipliedAlpha)
})

onMounted(async () => {
  logMessage('Application starting...')
  
  await Promise.all([
    loadFromCli(),
    initializeDragAndDrop(),
    initializeDownloadListeners()
  ])

  logMessage('Application initialized successfully')  
})

onUnmounted(() => {
  cleanupEventListeners()
  logMessage('Application cleaned up')
})
</script>

<template>
  <div class="w-screen h-screen flex relative bg-slate-900 overflow-hidden">
    <!-- mmodals -->
    <Logging :show="showLogs" @close="showLogs = false" />
    
    <SelectFolder 
    :show="showFolderSelection" 
    @close="showFolderSelection = false" 
    @select-folder="handleSelectFolder" 
    />
    
    <div class="flex-1 flex align-center items-center justify-center relative text-gray-400 transition-all duration-300 ease-in-out">
      <!-- {{ spinePlayer?.isInitialized() }} -->
      
      <!-- Controls button -->
      <div class="absolute top-8 left-8 z-50">
        <button 
          v-if="!showControls" 
          @click="toggleControls"
          class="p-4 bg-black/30 rounded-full opacity-25 hover:opacity-100 cursor-pointer transition-opacity duration-200"
          aria-label="Open controls"
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
            <path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm112-260q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Z" />
          </svg>
        </button>
      </div>

      <!-- Spine controls -->
      <SpineControls 
        :show-controls="showControls"
        :animations="spineAnimations"
        @open-logs="handleShowLogs"
        @select-folder="handleSelectFolder"
        @close="showControls = false"
        v-model:current-animation="spineCurrentAnimation"
        v-model:background-color="spineConfig.backgroundColor"
        v-model:premultiplied-alpha="spineConfig.premultipliedAlpha" 
        v-model:background-image="spineConfig.backgroundImage"
        v-model:loop-animation="spineConfig.loopAnimation"
      />

      <!-- Characters list btn -->
      <div class="absolute top-32 right-0 z-40">
        <button 
          @click="toggleCharactersList" 
          class="opacity-40 flex items-center gap-2 border-b border-x border-slate-700/80 bg-slate-800 backdrop-blur-sm py-1 px-3 rounded-b-xl text-slate-300 hover:text-white hover:bg-slate-700/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 transition-all duration-300 cursor-pointer hover:py-2 hover:opacity-100 rotate-90 origin-top-right"
          aria-label="Toggle characters list"
        >
          CHARACTERS
        </button>
      </div>

      <!-- Spine player -->
      <SpinePlayer
        v-show="!spineError"
        ref="spinePlayer" 
        :background-color="spineConfig.backgroundColor" 
        :premultiplied-alpha="spineConfig.premultipliedAlpha"
        :background-image="spineConfig.backgroundImage"
        :loop-animation="spineConfig.loopAnimation"
        @animations-loaded="handleAnimationsLoaded" 
        @error="onSpineError"
        @success="onSpineSuccess" 
      />

      <!-- Error -->
      <Error 
        v-if="spineError" 
        :error="spineError" 
        @show-logs="showLogs = true" 
        @select-folder="handleSelectFolder"
      >
        <template v-if="hasDownloadError" #action-button>
          <button 
            v-if="!isDownloadingSkeleton"
            class="text-sm py-2 px-4 text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-md cursor-pointer transition-colors"
            @click="downloadMissingSkeleton"
          >
            Download Original Skeleton from Github
          </button>

          <div v-else class="w-full">
            <div class="flex items-center justify-between gap-4 mb-2">
              <h6 class="block font-sans text-base antialiased font-semibold leading-relaxed tracking-normal text-blue-gray-900">
                Downloading Skeleton
              </h6>
              <h6 class="block font-sans text-base antialiased font-semibold leading-relaxed tracking-normal text-blue-gray-900">
                {{ downloadProgressPercentage }}%
              </h6>
            </div>
            <div class="flex-start flex h-2.5 w-full overflow-hidden rounded-full bg-blue-gray-50 font-sans text-xs font-medium">
              <div 
                :style="{ width: `${downloadProgressPercentage}%` }"
                class="flex items-center justify-center h-full overflow-hidden text-white break-all bg-gray-400 rounded-full transition-all duration-300" 
              />
            </div>
          </div>
        </template>
      </Error>
    </div>

    <!-- characters list -->
    <TransitionRoot :show="showCharactersList" as="template">
      <TransitionChild 
        as="div" 
        class="h-full bg-slate-900 border-l border-slate-700/50 flex-shrink-0 overflow-hidden"
        enter="transition-[width] duration-300 ease-in-out" 
        enter-from="w-0" 
        enter-to="w-2/5"
        leave="transition-[width] duration-300 ease-in-out" 
        leave-from="w-2/5" 
        leave-to="w-0"
      >
        <div class="h-full w-[40vw]">
          <CharactersList @character-selected="handleOnlineCharacter" />
        </div>
      </TransitionChild>
    </TransitionRoot>
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
</style>
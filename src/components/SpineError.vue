<script setup lang="ts">
import { useSlots } from 'vue'
import { useSpineStore } from '../stores/spine'
import { useUIStore } from '../stores/ui'
import { useI18n } from 'vue-i18n'

const slots = useSlots()
const uiStore = useUIStore()
const spineStore = useSpineStore()
const { t } = useI18n()

interface ErrorProps {
  title?: string
  message?: string
  details?: string
  retryable?: boolean
  failedAssets?: string[]
  showOpenFolder?: boolean
}

const props = withDefaults(defineProps<ErrorProps>(), {
  retryable: true,
})

const emit = defineEmits(['show-logs', 'open-folder', 'retry'])

function handleGoBack() {
  spineStore.clearSource()
}

async function handleRetry() {
  await emit('retry')
}

async function handleOpenFolder() {
  await emit('open-folder')
}

function handleShowLogs() {
  uiStore.openLogs()
}

function toggleTruncate(event: MouseEvent) {
  const target = event.target as HTMLElement
  target.classList.toggle('truncate')
}
</script>

<template>
  <div class="flex flex-col items-center gap-6 p-8 max-w-xl mx-auto">
    <div class="relative">
      <svg class="w-16 h-16 text-red-400 drop-shadow-lg" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"
        fill="currentColor">
        <path
          d="m40-120 440-760 440 760H40Zm138-80h604L480-720 178-200Zm302-40q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm-40-120h80v-200h-80v200Zm40-100Z" />
      </svg>
      <div class="absolute inset-0 w-16 h-16 bg-red-500/20 blur-xl -z-10"></div>
    </div>

    <div class="flex flex-col items-center gap-1 text-center">
      <h2 class="text-xl font-semibold text-red-400">
        {{ props.title || t('error.title') }}
      </h2>
      <p class="text-slate-400 leading-relaxed">
        {{ props.message || t('error.message') }}
      </p>
      <p v-if="props.details"
         class="text-slate-500 text-sm mt-1 max-w-xl truncate hover:text-slate-400 cursor-pointer"
         @click="toggleTruncate">
        {{ props.details }}
      </p>
      <p v-for="asset in props.failedAssets"
         :key="asset"
         class="text-slate-500 text-sm truncate mt-1 max-w-lg hover:text-slate-400 cursor-pointer"
         @click="toggleTruncate">
        {{ asset }}
      </p>
    </div>

    <div class="flex flex-col items-center gap-4 w-full">
      <slot v-if="slots.actionButton" name="actionButton" />

      <div class="flex w-full gap-3">
        <button @click="handleGoBack"
          class="flex-1 px-4 py-2.5 cursor-pointer bg-slate-800/30 hover:bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-300 hover:text-white transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 backdrop-blur-sm">
          {{ t('common.goBack') }}
        </button>
        <button v-if="props.retryable" @click="handleRetry"
          class="flex-1 px-4 py-2.5 cursor-pointer bg-slate-800/30 hover:bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-300 hover:text-white transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 backdrop-blur-sm">
          {{ t('common.retry') }}
        </button>
      </div>
    </div>

    <div class="flex gap-2">
      <button @click="handleShowLogs"
        class="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 backdrop-blur-sm">
        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
          <path
            d="M320-440h320v-80H320v80Zm0 120h320v-80H320v80Zm0 120h200v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z" />
        </svg>
        {{ t('common.viewLogs') }}
      </button>
      <button v-if="props.showOpenFolder" @click="handleOpenFolder"
        class="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 backdrop-blur-sm">
        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
          <path
            d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z" />
        </svg>
        {{ t('common.openFolder') }}
      </button>
    </div>
  </div>
</template>

<style scoped></style>

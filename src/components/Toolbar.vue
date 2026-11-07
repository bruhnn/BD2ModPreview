<script
  setup
  lang="ts"
>
import { History, Sparkles, Image, Clapperboard, ChevronRight, RefreshCw, Pause, Repeat, SkipBack, X, Settings, Users } from "@lucide/vue"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { onClickOutside } from "@vueuse/core"
import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/vue"

import { usePreviewerStore } from "../stores/previewer"
import { useUIStore } from "../stores/ui"
import { useNetworkStatus } from "../composables/useNetworkStatus"
import { NOVEL_BACKGROUNDS, novelThumbnail, loadNovelBackground } from "../data/novelBackgrounds"

defineProps<{ charactersOpen: boolean }>()

const emit = defineEmits<{ characters: [] }>()
const { t } = useI18n()
const uiStore = useUIStore()
const previewerStore = usePreviewerStore()

const backgroundOpen = ref(false)
const toolbar = ref<HTMLElement | null>(null)
const backgroundButton = ref<HTMLElement | null>(null)
const popover = ref<HTMLElement | null>(null)

const { floatingStyles } = useFloating(backgroundButton, popover, {
  placement: "bottom-start",
  whileElementsMounted: autoUpdate,
  middleware: [offset(6), flip(), shift({ padding: 8 })],
})

onClickOutside(toolbar, () => backgroundOpen.value = false)

const animations = computed(() => [...new Set(previewerStore.previewers.flatMap(p => p.allAnimations))])
const animation = computed({
  get: () => previewerStore.globalAnimation || previewerStore.previewers.find(p => p.allAnimations.length)?.settings.currentAnimation || "",
  set: (value: string) => previewerStore.changeAnimationForAll(value),
})
const loop = computed({
  get: () => previewerStore.previewers.every(p => p.settings.loopAnimation),
  set: (value: boolean) => previewerStore.setLoopAnimationForAll(value),
})
const backgroundColor = computed({
  get: () => {
    const value = previewerStore.previewers[0]?.settings.background
    return value?.type === "color" ? value.color : "#000000"
  },
  set: (color: string) => previewerStore.setBackgroundColorForAll(color),
})

const fileInput = ref<HTMLInputElement | null>(null)

const gameBackground = computed(() => previewerStore.previewers.find(p => p.gameBackground)?.gameBackground ?? null)
const gameBackgroundSelected = computed(() => previewerStore.previewers.some(p => p.settings.background.type === 'game'))
function toggleGameBackground() {
  previewerStore.previewers.forEach(p => {
    if (gameBackgroundSelected.value) {
      if (p.settings.background.type === 'game') p.settings.background = { type: 'theme' }
    } else if (p.gameBackground) p.settings.background = { type: 'game' }
  })
}

const presetColors = ["#1e1f24", "#2b2f3a", "#3a2f2f", "#2f3a33", "#e9e6df"]
const currentColor = computed(() => {
  const value = previewerStore.previewers[0]?.settings.background
  return value?.type === "color" ? value.color.toLowerCase() : ""
})

// A few game backgrounds; the dialog has all of them.
const shortlist = NOVEL_BACKGROUNDS.slice(0, 3)
const { isConnected, isChecking, checkConnection } = useNetworkStatus()
async function applyShortlist(id: number) {
  const url = await loadNovelBackground(id)
  if (url) previewerStore.previewers.forEach(p => { p.settings.background = { type: "image", path: url } })
  else checkConnection()
}
watch(backgroundOpen, (open) => { if (open) checkConnection() })
const backgroundImage = computed(() => previewerStore.previewers[0]?.settings.background.type === "image")

function selectBackground(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const path = reader.result as string
    previewerStore.setBackgroundImageForAll(path)
  }
  reader.readAsDataURL(file)
  input.value = ""
}
</script>

<template>
  <div ref="toolbar" id="toolbar" @keydown.esc="backgroundOpen = false">
    <div class="toolbar-row">
      <button class="icon-button" :aria-label="t('preview.restartAll')" :title="t('preview.restartAll')"
        :disabled="!animations.length" @click="previewerStore.restartCount++">
        <SkipBack :size="16" />
      </button>
      <button class="icon-button" :aria-label="previewerStore.paused ? t('preview.playAll') : t('preview.pauseAll')"
        :title="previewerStore.paused ? t('preview.play') : t('preview.pause')" :disabled="!animations.length"
        @click="previewerStore.paused = !previewerStore.paused">
        <Pause :size="16" />
      </button>
      <button class="text-button icon-button" :aria-label="t('preview.loopAll')" :title="t('preview.loopAll')"
        :aria-pressed="loop" :disabled="!animations.length" @click="loop = !loop">
        <Repeat :size="16" />
      </button>
      <select v-model="animation" class="animation-select" :aria-label="t('preview.animation')"
        :disabled="!animations.length">
        <option v-if="!animations.length" value="">{{ t('preview.noAnimations') }}</option>
        <option v-for="name in animations" :key="name" :value="name">{{ name }}</option>
      </select>
      <button ref="backgroundButton" class="text-button icon-button" :aria-label="t('preview.background')"
        :title="t('preview.background')" :aria-expanded="backgroundOpen" @click="backgroundOpen = !backgroundOpen">
        <Image :size="16" />
      </button>
      <div class="toolbar-actions">
        <button class="text-button icon-button" :aria-label="t('whatsNew.title')" :title="t('whatsNew.title')"
          :aria-expanded="uiStore.isWhatsNewVisible" @click="backgroundOpen = false; uiStore.openWhatsNew()">
          <Sparkles :size="16" />
        </button>
        <button class="text-button icon-button" :aria-label="t('controls.actions.viewHistory')"
          :title="t('controls.actions.viewHistory')" :aria-expanded="uiStore.isHistoryVisible"
          @click="backgroundOpen = false; uiStore.openHistory()">
          <History :size="16" />
        </button>
        <button class="text-button icon-button" :aria-label="t('preview.settings')" :title="t('preview.settings')"
          :aria-expanded="uiStore.isSettingsVisible" @click="backgroundOpen = false; uiStore.openSettings()">
          <Settings :size="16" />
        </button>
        <button class="text-button icon-button" :aria-label="t('preview.characters')" :title="t('preview.characters')"
          :aria-expanded="charactersOpen" @click="backgroundOpen = false; $emit('characters')">
          <Users :size="16" />
        </button>
      </div>
    </div>

    <div v-if="backgroundOpen" ref="popover" :style="floatingStyles" class="background-popover" role="dialog">
      <div class="background-popover-header">
        {{ t('preview.background') }}
        <span class="background-popover-actions">
          <button type="button" class="background-link" @click="previewerStore.resetBackgroundForAll()">
            {{ t('backgroundsPanel.resetShort') }}
          </button>
          <button type="button" class="close-button" :aria-label="t('preview.close')" @click="backgroundOpen = false">
            <X :size="16" />
          </button>
        </span>
      </div>

      <div class="background-swatches" role="group" :aria-label="t('preview.color')">
        <button v-for="color in presetColors" :key="color" type="button" class="background-swatch"
          :style="{ background: color }" :aria-label="color" :aria-pressed="currentColor === color"
          @click="backgroundColor = color" />
        <label class="background-swatch background-swatch-custom" :title="t('preview.color')">
          <input v-model="backgroundColor" type="color" :aria-label="t('preview.color')" />
        </label>
      </div>

      <div class="background-popover-section">
        <span>{{ t('backgroundsPanel.title') }}</span>
        <button type="button" class="background-link" @click="backgroundOpen = false; uiStore.openBackgrounds()">
          {{ t('backgroundsPanel.seeAllShort') }}<ChevronRight :size="14" aria-hidden="true" />
        </button>
      </div>
      <div v-if="!isConnected" class="background-popover-notice" role="status">
        <span>{{ t('backgroundsPanel.offline') }}</span>
        <button type="button" class="background-link" :disabled="isChecking" @click="checkConnection()">
          <RefreshCw :size="14" aria-hidden="true" />{{ t('common.retry') }}
        </button>
      </div>
      <div v-else class="background-thumbs">
        <button v-for="id in shortlist" :key="id" type="button" :title="t('backgroundsPanel.item', { number: id })"
          :aria-label="t('backgroundsPanel.item', { number: id })" @click="applyShortlist(id)">
          <img loading="lazy" draggable="false" :src="novelThumbnail(id)" alt="" />
        </button>
      </div>

      <div class="background-popover-divider" />
      <input ref="fileInput" type="file" accept="image/*" hidden @change="selectBackground" />
      <button type="button" class="background-popover-row" @click="fileInput?.click()">
        <Image :size="16" aria-hidden="true" /><span>{{ t('preview.chooseImage') }}</span>
      </button>
      <button v-if="backgroundImage" type="button" class="background-popover-row"
        @click="previewerStore.resetBackgroundForAll()">
        <X :size="16" aria-hidden="true" /><span>{{ t('preview.removeImage') }}</span>
      </button>

      <button v-if="gameBackground" type="button" class="background-popover-row" role="switch"
        :aria-checked="gameBackgroundSelected" :title="t('preview.gameBackgroundHint')" @click="toggleGameBackground">
        <Clapperboard :size="16" aria-hidden="true" /><span>{{ t('preview.gameBackground') }}</span>
        <span class="background-switch" :class="{ on: gameBackgroundSelected }" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<style scoped>
#toolbar {
  container-type: inline-size;
  position: relative;
  flex-shrink: 0;
  color: var(--text-primary);
  background: var(--surface-app);
  font-size: 14px;
  z-index: 40;
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-default);
}

.toolbar-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  margin-left: auto;
}

button,
select {
  height: 32px;
  border: 1px solid var(--border-default);
  background: var(--surface-input);
  color: var(--text-primary);
  font: inherit;
}

button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 12px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

button:hover {
  border-color: var(--border-strong);
}

button:disabled,
select:disabled {
  opacity: .5;
  cursor: default;
}

button:focus-visible,
select:focus-visible,
input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.icon-button {
  width: 32px;
  flex-shrink: 0;
  padding: 6px;
}

select {
  padding: 0 10px;
  border-radius: 2px;
  min-width: 0;
}

.animation-select {
  width: 210px;
  flex: 0 1 210px;
  max-width: 210px;
}

.text-button {
  border-color: transparent;
  background: transparent;
}

.text-button:hover,
.text-button[aria-expanded="true"] {
  background: var(--state-hover);
  border-color: transparent;
}

input[type="color"] {
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 32px;
  padding: 3px;
  border: 1px solid var(--border-default);
  border-radius: 4px;
  background: var(--surface-input);
  cursor: pointer;
}

.background-popover {
  position: absolute;
  width: 280px;
  max-width: calc(100vw - 16px);
  padding: 12px;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--surface-popover);
}

.background-popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  margin-bottom: 10px;
}

.background-popover-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.background-popover button {
  height: auto;
  border: 0;
  background: transparent;
  font-weight: 400;
  white-space: normal;
}

.background-popover button:hover {
  border-color: transparent;
}

.background-popover .background-link {
  gap: 2px;
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 12px;
}

.background-popover .background-link:hover {
  background: var(--state-hover);
  color: var(--text-primary);
}

.background-popover .background-link svg {
  width: 14px;
  height: 14px;
}

.background-swatches {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
}

.background-popover .background-swatch {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 1;
  padding: 0;
  border: 1px solid var(--border-default);
  border-radius: 6px;
}

.background-popover .background-swatch:hover {
  border-color: var(--border-strong);
}

.background-popover .background-swatch[aria-pressed="true"] {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.background-swatch-custom {
  overflow: hidden;
  cursor: pointer;
  background: conic-gradient(#d85a30, #ba7517, #639922, #378add, #7f77dd, #d85a30);
}

.background-swatch-custom input[type="color"] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.background-popover-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 14px 0 6px;
  color: var(--text-secondary);
  font-size: 12px;
}

.background-popover-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  padding: 6px 8px;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
}

.background-thumbs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.background-popover .background-thumbs button {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--surface-input);
}

.background-popover .background-thumbs button:hover {
  border-color: var(--accent);
}

.background-thumbs img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.background-popover-divider {
  height: 1px;
  margin: 12px -12px 6px;
  background: var(--border-default);
}

.background-popover .background-popover-row {
  justify-content: flex-start;
  gap: 10px;
  width: 100%;
  padding: 7px 8px;
  border-radius: 6px;
  color: var(--text-primary);
  text-align: left;
}

.background-popover .background-popover-row:hover {
  background: var(--state-hover);
}

.background-popover-row svg {
  color: var(--text-secondary);
}

.background-popover-row span:not(.background-switch) {
  flex: 1;
}

.background-switch {
  position: relative;
  flex-shrink: 0;
  width: 30px;
  height: 17px;
  border-radius: 9px;
  background: var(--border-strong);
}

.background-switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--text-primary);
  transition: transform 150ms ease;
}

.background-switch.on {
  background: var(--accent);
}

.background-switch.on::after {
  background: var(--text-on-accent);
  transform: translateX(13px);
}

@container (max-width: 600px) {
  .toolbar-row {
    padding-left: 8px;
    padding-right: 8px;
  }

  .animation-select {
    flex: 1;
  }
}

@container (max-width: 480px) {

  .toolbar-row,
  .toolbar-actions {
    gap: 4px;
  }

  .toolbar-row {
    flex-wrap: wrap;
  }

  .animation-select {
    min-width: 70px;
  }
}

button[aria-pressed="true"] {
  color: var(--accent);
  background: var(--state-hover);
}

.close-button {
  background: transparent;
  border: 0;
  padding: 0;
  color: var(--text-secondary);
}

.close-button:hover {
  color: var(--text-primary);
}
</style>

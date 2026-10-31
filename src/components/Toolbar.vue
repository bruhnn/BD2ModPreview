<script setup lang="ts">
import { History, Sparkles, Image, Pause, Repeat, RotateCcw, SkipBack, X, Settings, Users } from "@lucide/vue"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { onClickOutside } from "@vueuse/core"
import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/vue"

import { usePreviewerStore } from "../stores/previewer"
import { useUIStore } from "../stores/ui"

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
        <button class="text-button icon-button" :aria-label="t('controls.actions.viewHistory')" :title="t('controls.actions.viewHistory')"
          :aria-expanded="uiStore.isHistoryVisible" @click="backgroundOpen = false; uiStore.openHistory()">
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
        <button type="button" class="close-button" :aria-label="t('preview.close')" @click="backgroundOpen = false">
          <X :size="16" />
        </button>
      </div>

      <label class="background-popover-color-label" for="bgPopover-background-color">
        {{ t('preview.color') }}
      </label>

      <div class="background-popover-color-controls">
        <input id="bgPopover-background-color" v-model="backgroundColor" type="color" />
        <button type="button" class="icon-button" :aria-label="t('preview.resetBackground')"
          :title="t('preview.resetBackground')" @click="previewerStore.resetBackgroundForAll()">
          <RotateCcw :size="16" />
        </button>
      </div>

      <input ref="fileInput" type="file" accept="image/*" hidden @change="selectBackground" />

      <button class="background-popover-image-button" @click="fileInput?.click()">
        {{ t('preview.chooseImage') }}
      </button>

      <button v-if="backgroundImage" class="text-button" @click="previewerStore.resetBackgroundForAll()">
        {{ t('preview.removeImage') }}
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

.background-popover-color-label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.background-popover-color-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
}

.background-popover-image-button {
  margin-right: 8px;
}

.background-popover {
  position: absolute;
  width: 300px;
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
  margin-bottom: 12px;
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

<script
  setup
  lang="ts"
>
import { useI18n } from "vue-i18n"
import { Ellipsis, Scan, ExternalLink, Flame, GripVertical, PanelRightClose, PanelBottomClose, Play, Pause, Repeat, Hand, Eye, EyeOff, Check, ChevronDown, ChevronRight, FolderOpen, Focus, Image, Layers, Maximize, Palette, Shirt, Pencil, Plus, RotateCcw, SkipBack, Trash2, X } from "@lucide/vue"
import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/vue"
import { onClickOutside, useTimeoutFn } from "@vueuse/core"
import { computed, nextTick, ref, useTemplateRef, watch } from "vue"

import { usePreviewDrag } from "../composables/usePreviewDrag"
import { usePreview } from "../composables/usePreview"
import SequenceEditor from "./modals/SequenceEditor.vue"
import type { AnimationSequence } from "../types/spine"
import { useModManagerStore } from "../stores/modManager"
import { usePreviewerStore } from "../stores/previewer"
import { useUIStore } from "../stores/ui"

import { open } from "@tauri-apps/plugin-dialog"
import { openUrl } from "@tauri-apps/plugin-opener"
import { invoke } from "@tauri-apps/api/core"

import { useLogger } from "../composables/useLogger"
import RecentFolderItem from "./RecentFolderItem.vue"
import { useHistory } from "../composables/useHistory"
import type { HistoryItem } from "../types/history"

const { t } = useI18n()
const props = defineProps<{
  previewId: string
  canAddRight: boolean
  canAddBottom: boolean
}>()
const previewerStore = usePreviewerStore()
const uiStore = useUIStore()
const datingButton = ref<HTMLElement | null>(null)
const datingTooltip = ref<HTMLElement | null>(null)
const datingTooltipOpen = ref(false)
const { start: closeDatingTooltip, stop: keepDatingTooltip } = useTimeoutFn(() => {
  datingTooltipOpen.value = false
}, 150, { immediate: false })
const { floatingStyles: datingTooltipStyles } = useFloating(datingButton, datingTooltip, {
  placement: "top-end",
  strategy: "fixed",
  middleware: [offset(8), flip(), shift({ padding: 8 })],
  whileElementsMounted: autoUpdate,
})

const playerContainer = useTemplateRef("player-container")

const {
  cutsceneAvailable,
  cutsceneActive,
  cutsceneIncomplete,
  playGameCutscene,
  minigameAvailable,
  minigameEnabled,
  minigameFever,
  minigameFeverAvailable,
  datingMarkers,
  datingGroups,
  datingGroup,
  selectDatingGroup,
  datingTools,
  datingTool,
  selectDatingTool,
  datingGauge,
  datingGaugeRange,
  isDating,
  datingAvailable,
  datingEnabled,
  showDatingPoints,
  showDatingAreas,
  error,
  isLoading,
  retry,
  title,
  source,
  settings,
  allAnimations,
  paused,
  loopAnimation,
  animationSelection,
  playbackTime,
  duration,
  seek,
  restart,
  resetCamera,
  fitCharacter,
  centerCharacter,
  skins,
  skin,
  layers,
  highlightedLayer,
  hiddenLayers,
  sequences,
  activeSequence,
  playSequence,
  stopSequence,
} = usePreview(props.previewId, playerContainer)
const { isDragging, dropTarget, startDrag, moveDrag, finishDrag, cancelDrag } = usePreviewDrag(({ row, column, newRow }) => {
  previewerStore.movePreview(props.previewId, row, column, newRow)
})
const modManager = useModManagerStore()
const { history } = useHistory()
const { logMessage } = useLogger()

const animationsOpen = ref(false)
const sequenceEditorOpen = ref(false)
const editingSequence = ref<number | null>(null)
const animationButton = ref<HTMLElement | null>(null)
const animationPopover = ref<HTMLElement | null>(null)
const datingToolsOpen = ref(false)
const datingToolsButton = ref<HTMLElement | null>(null)
const datingToolsPopover = ref<HTMLElement | null>(null)
const syncGroup = computed({
  get: () => previewerStore.getPreview(props.previewId)?.syncGroup ?? 0,
  set: (value: number) => {
    const preview = previewerStore.getPreview(props.previewId)
    if (preview) preview.syncGroup = value || null
  },
})
const layersOpen = ref(false)
const layerSearch = ref("")
const layersButton = ref<HTMLElement | null>(null)
const layersPopover = ref<HTMLElement | null>(null)
const contextOpen = ref(false)
const contextPopover = ref<HTMLElement | null>(null)
const contextPoint = ref({ getBoundingClientRect: () => new DOMRect() })
const submenu = ref<"background" | "skin" | null>(null)
const submenuButton = ref<HTMLElement | null>(null)
const submenuPopover = ref<HTMLElement | null>(null)
const colorInput = ref<HTMLInputElement | null>(null)
const backgroundInput = ref<HTMLInputElement | null>(null)
const modBackgrounds = ref<[string, string][]>([])
const backgroundsLoading = ref(false)
const backgroundsError = ref(false)
const isOpening = ref(false)
const recentExpanded = ref(true)

const filteredLayers = computed(() => layers.value.filter(layer =>
  layer.toLowerCase().includes(layerSearch.value.trim().toLowerCase()),
))
const managerMod = computed(() => {
  if (source.value?.type !== "folder") return null
  const path = source.value.path.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase()
  return modManager.mods.find(mod => mod.path.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase() === path) ?? null
})
const managerDisabled = computed(() => !modManager.connected || !managerMod.value || managerMod.value.errors.length > 0 || modManager.pending.includes(managerMod.value.name))
const managerHint = computed(() => !modManager.connected ? t("preview.managerDisconnected")
  : !managerMod.value ? t("preview.managerUnknown")
    : managerMod.value.errors.length ? t("preview.managerModErrors") : t("preview.managerEnable"))
const recentFolders = computed(() => history.value.filter(item => item.source.type === "folder").slice(0, 5))

const { floatingStyles: animationStyles } = useFloating(animationButton, animationPopover, {
  placement: "top-end",
  strategy: "fixed",
  whileElementsMounted: autoUpdate,
  middleware: [offset(6), flip(), shift({ padding: 8 })],
})

const { floatingStyles: datingToolsStyles } = useFloating(datingToolsButton, datingToolsPopover, {
  placement: "top-end",
  strategy: "fixed",
  whileElementsMounted: autoUpdate,
  middleware: [offset(6), flip(), shift({ padding: 8 })],
})

const { floatingStyles: layerStyles } = useFloating(layersButton, layersPopover, {
  placement: "top-end",
  strategy: "fixed",
  whileElementsMounted: autoUpdate,
  middleware: [offset(6), flip(), shift({ padding: 8 })],
})

const { floatingStyles: submenuStyles } = useFloating(submenuButton, submenuPopover, {
  placement: "right-start",
  strategy: "fixed",
  whileElementsMounted: autoUpdate,
  middleware: [flip(), shift({ padding: 8 })],
})

const { floatingStyles: contextStyles } = useFloating(contextPoint, contextPopover, {
  placement: "bottom-start",
  strategy: "fixed",
  whileElementsMounted: autoUpdate,
  middleware: [flip(), shift({ padding: 8 })],
})

function openSequence(index: number | null) {
  editingSequence.value = index
  animationsOpen.value = false
  sequenceEditorOpen.value = true
}

function saveSequence(sequence: AnimationSequence) {
  if (editingSequence.value === null) sequences.value.push(sequence)
  else {
    const playing = activeSequence.value === sequences.value[editingSequence.value]
    sequences.value[editingSequence.value] = sequence
    if (playing) playSequence(sequence)
  }
  sequenceEditorOpen.value = false
}

function deleteSequence(index: number) {
  if (activeSequence.value === sequences.value[index]) stopSequence()
  sequences.value.splice(index, 1)
}

function openSubmenu(name: "background" | "skin", event: Event) {
  if (name === "skin" && skins.value.length < 2) return
  submenuButton.value = event.currentTarget as HTMLElement
  submenu.value = name
}

async function openContext(event: MouseEvent | KeyboardEvent) {
  if (!source.value) return
  const rect = playerContainer.value!.getBoundingClientRect()
  const x = event instanceof MouseEvent ? event.clientX : rect.left + rect.width / 2
  const y = event instanceof MouseEvent ? event.clientY : rect.top + rect.height / 2
  contextPoint.value = { getBoundingClientRect: () => new DOMRect(x, y, 0, 0) }
  animationsOpen.value = false
  layersOpen.value = false
  submenu.value = null
  contextOpen.value = true
  await nextTick()
  contextPopover.value?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus()
}

function closeContext() {
  contextOpen.value = false
  playerContainer.value?.focus()
}

function onPreviewKeydown(event: KeyboardEvent) {
  if (event.ctrlKey || event.altKey || event.metaKey || event.repeat) return
  if ((event.target as HTMLElement).closest("input, select, textarea, [contenteditable=true]")) return
  if (!allAnimations.value.length) return
  switch (event.key.toLowerCase()) {
    case "f": fitCharacter()
      break
    case "c": centerCharacter()
      break
    case "r": resetCamera()
      break
    case "s":
      if (!event.shiftKey) return
      closeContext()
      openSequence(null)
      break
    default: return
  }
  event.preventDefault()
  if (contextOpen.value) closeContext()
}

function selectBackground(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    if (settings.value) settings.value.background = { type: "image", path: reader.result as string }
  }
  reader.readAsDataURL(file)
  input.value = ""
}

function changeEnabled(event: Event) {
  const input = event.target as HTMLInputElement
  const enabled = input.checked
  input.checked = managerMod.value?.enabled ?? false
  if (managerMod.value && !managerDisabled.value) modManager.setEnabled(managerMod.value, enabled)
}

function openRecentFolder(item: HistoryItem) {
  if (item.source.type !== "folder") return
  const preview = previewerStore.getPreview(props.previewId)
  if (!preview) return
  preview.title = item.source.path.split(/[\\/]/).filter(Boolean).pop() || item.source.path
  preview.source = { type: "folder", path: item.source.path }
}

function addPreview(direction: "right" | "bottom") {
  if (previewerStore.previewLimitReached) return
  const current = previewerStore.getPreview(props.previewId)
  if (!current) return

  const position = direction === "right"
    ? { row: current.pos.row, column: current.pos.column + 1 }
    : { row: current.pos.row + 1, column: 0 }

  for (const preview of previewerStore.previewers) {
    if (direction === "right") {
      if (preview.pos.row === position.row && preview.pos.column >= position.column) {
        preview.pos.column++
      }
    } else if (preview.pos.row >= position.row) {
      preview.pos.row++
    }
  }

  previewerStore.openPreview(t("preview.newPreview"), null, position)
}

async function selectFolder() {
  if (isOpening.value) return
  isOpening.value = true
  try {
    const path = await open({ directory: true, multiple: false })
    if (!path) return
    const preview = previewerStore.getPreview(props.previewId)
    if (!preview) return
    preview.title = path.split(/[\\/]/).filter(Boolean).pop() || path
    preview.source = { type: "folder", path }
  } catch (error) {
    logMessage(`Failed to open preview: ${error}`, "error")
  } finally {
    isOpening.value = false
  }
}

onClickOutside(datingToolsPopover, () => datingToolsOpen.value = false, { ignore: [datingToolsButton] })

onClickOutside(animationPopover, () => animationsOpen.value = false, { ignore: [animationButton] })

watch(layersOpen, open => { if (!open) highlightedLayer.value = "" })

onClickOutside(layersPopover, () => layersOpen.value = false, { ignore: [layersButton] })

watch([source, contextOpen, submenu], async ([value, open, menu], _previous, onCleanup) => {
  modBackgrounds.value = []
  backgroundsError.value = false
  backgroundsLoading.value = false
  if (value?.type !== "folder" || !open || menu !== "background") return
  let cancelled = false
  onCleanup(() => cancelled = true)
  backgroundsLoading.value = true
  try {
    const images = await invoke<[string, string][]>("get_mod_backgrounds", { folderPath: value.path })
    if (!cancelled) modBackgrounds.value = images
  } catch (error) {
    if (!cancelled) backgroundsError.value = true
    logMessage("Failed to load mod backgrounds: " + JSON.stringify(error), "error")
  } finally {
    if (!cancelled) backgroundsLoading.value = false
  }
})

onClickOutside(contextPopover, () => contextOpen.value = false, { ignore: [submenuPopover] })
</script>
<template>
  <SequenceEditor v-if="sequenceEditorOpen" :animations="allAnimations"
    :sequence="editingSequence === null ? null : sequences[editingSequence]" @close="sequenceEditorOpen = false"
    @save="saveSequence" />
  <div :data-preview-id="props.previewId" class="preview-panel" :class="{
    dragging: isDragging,
  }" :style="settings?.background.type === 'image' ? {
    backgroundImage: `url('${settings.background.path}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } : { background: settings?.background.type === 'color' ? settings.background.color : 'var(--surface-app)' }">
    <Teleport to="body">
      <div v-if="isDragging && dropTarget" class="preview-drop-target" :style="{
        left: dropTarget.left + 'px', top: dropTarget.top + 'px',
        width: dropTarget.width + 'px', height: dropTarget.height + 'px',
      }" aria-hidden="true">
        <Plus :size="16" />
      </div>
    </Teleport>
    <div class="preview-titlebar">
      <label v-if="managerMod" class="mod-toggle" :title="managerHint">
        <input :checked="managerMod?.enabled ?? false" :disabled="managerDisabled" @change="changeEnabled"
          type="checkbox" :aria-label="managerHint" class="preview-checkbox" />
        <Check class="checkbox-tick" :size="14" :stroke-width="3" color="var(--text-on-accent)" aria-hidden="true" />

      </label>
      <span v-if="managerMod && modManager.errors[managerMod.name]" class="mod-error" role="alert"
        :title="modManager.errors[managerMod.name]">{{ modManager.errors[managerMod.name] }}</span>
      <span :title="title" class="preview-name">{{ title }}</span>
      <div class="preview-sync-groups" role="group" :aria-label="t('preview.syncGroups')">
        <button v-for="group in [1, 2, 3]" :key="group" type="button" class="preview-titlebar-action"
          :aria-pressed="previewerStore.getPreview(props.previewId)?.syncGroup === group"
          :title="t('preview.syncGroup', { group })" :aria-label="t('preview.syncGroup', { group })"
          @click="previewerStore.toggleSyncGroup(props.previewId, group)">{{ group }}</button>
      </div>
      <select v-model.number="syncGroup" class="preview-sync-select" :aria-label="t('preview.syncGroups')"
        :title="t('preview.syncGroups')">
        <option :value="0">{{ t('preview.none') }}</option>
        <option v-for="group in [1, 2, 3]" :key="group" :value="group">{{ group }}</option>
      </select>
      <button v-if="canAddRight" :disabled="previewerStore.previewLimitReached" type="button"
        :title="t('preview.addRight')" :aria-label="t('preview.addRight')" class="preview-titlebar-action"
        @click="addPreview('right')">
        <PanelRightClose :size="16" aria-hidden="true" />
      </button>
      <button v-if="canAddBottom" :disabled="previewerStore.previewLimitReached" type="button"
        :title="t('preview.addBottom')" :aria-label="t('preview.addBottom')" class="preview-titlebar-action"
        @click="addPreview('bottom')">
        <PanelBottomClose :size="16" aria-hidden="true" />
      </button>
      <button type="button" :title="t('preview.dragMove')" :aria-label="t('preview.rearrange')"
        class="preview-titlebar-action preview-grip" @pointerdown="startDrag" @pointermove="moveDrag"
        @pointerup="finishDrag" @pointercancel="cancelDrag" @lostpointercapture="cancelDrag" @keydown.esc="cancelDrag">
        <GripVertical :size="16" aria-hidden="true" />
      </button>
      <button type="button" :title="t('preview.closePreview')" :aria-label="t('preview.closePreview')"
        class="preview-close-button preview-close-button-small" @click="previewerStore.closePreview(props.previewId)">
        <X :size="16" aria-hidden="true" />
      </button>
    </div>
    <div v-if="!source" class="empty-preview">
      <div class="empty-content">
        <div class="empty-header">
          <h3 class="empty-title">{{ t('preview.chooseFolder') }}</h3>
          <button type="button" :disabled="isOpening" @click="selectFolder" class="open-folder">
            <FolderOpen :size="16" aria-hidden="true" />{{ t('preview.openFolder') }}
          </button>
        </div>
        <div v-if="recentFolders.length" class="recent-section">
          <button type="button" class="recent-toggle" :aria-expanded="recentExpanded"
            :aria-controls="'recent-folders-' + props.previewId" @click="recentExpanded = !recentExpanded">
            <ChevronDown :size="16" :class="{ collapsed: !recentExpanded }" aria-hidden="true" />
            {{ t('preview.recentFolders') }}
            <span class="recent-count">{{ recentFolders.length }}</span>
          </button>
          <div v-show="recentExpanded" :id="'recent-folders-' + props.previewId" class="recent-list">
            <RecentFolderItem v-for="item in recentFolders" :key="item.id" :folder-history="item"
              @clicked="openRecentFolder" />
          </div>
        </div>
      </div>
    </div>
    <p v-if="cutsceneActive && cutsceneIncomplete" class="cutscene-warning" role="status">
      {{ t('preview.cutsceneIncomplete') }}
    </p>
    <div v-if="source && error" class="preview-error" role="alert">
      <p class="error-title">{{ t('preview.loadFailed') }}</p>
      <p class="error-details">{{ error }}</p>
      <div class="error-actions">
        <button class="error-button" @click="retry">{{ t('common.retry') }}</button>
        <button class="error-button" @click="selectFolder">{{ t('common.openFolder') }}</button>
      </div>
    </div>
    <p v-if="source && isLoading && !error" role="status" class="preview-loading">{{ t('preview.loading') }}</p>
    <div v-show="source && !error" class="preview-stage">
      <div ref="player-container" :id="`player-container-${props.previewId}`" tabindex="0"
        class="player-container" @contextmenu.prevent="openContext" @pointerdown.capture="playerContainer?.focus()"
        @keydown="onPreviewKeydown" @keydown.shift.f10.prevent="openContext" />
      <TransitionGroup v-if="datingEnabled && !isLoading" name="dating-point-fade" tag="div" class="dating-markers" aria-hidden="true">
        <div v-for="marker in datingMarkers" :key="marker.key" class="dating-point-layer"
          :style="{ color: marker.drag ? uiStore.datingPointStyle.dragColor : uiStore.datingPointStyle.clickColor }">
          <div v-if="showDatingAreas" class="dating-area" :style="marker.box" />
          <div v-if="showDatingPoints" class="dating-marker" :class="{ pressed: marker.pressed, dragging: marker.dragging, hovered: marker.hovered }"
            :style="{ left: `${marker.x}px`, top: `${marker.y}px` }">
            <div class="dating-marker-motion" :style="{ transform: `translate(${marker.dx}px, ${marker.dy}px)` }">
              <div class="dating-marker-scale" :style="{ transform: `scale(${uiStore.datingPointStyle.size / 100})` }">
              <span class="dating-marker-ring" />
              <span class="dating-marker-dot-position"><span :key="marker.pop" class="dating-marker-dot" :class="{ pop: !!marker.pop }" /></span>
              <span v-for="time in marker.ripples" :key="time" class="dating-marker-ripple" />
              <template v-if="marker.drag">
                <span v-for="rotation in [0, 90, 180, 270]" :key="rotation" class="dating-marker-arrow-axis"
                  :style="{ transform: `rotate(${rotation}deg)` }">
                  <span class="dating-marker-arrow-gap">
                    <svg class="dating-marker-arrow" width="6" height="10" viewBox="0 0 6 10" fill="none"
                      stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M1 1l4 4-4 4" />
                    </svg>
                  </span>
                </span>
              </template>
              </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>
    <div v-if="datingEnabled && datingGaugeRange" class="dating-gauge" :aria-label="t('preview.datingGauge')">
      <span>{{ datingGaugeRange.y }}</span>
      <progress :value="datingGauge - datingGaugeRange.x" :max="datingGaugeRange.y - datingGaugeRange.x" />
      <span>{{ Math.round(datingGauge) }}</span>
    </div>
    <input v-if="settings" ref="colorInput" type="color" hidden
      :value="settings.background.type === 'color' ? settings.background.color : '#000000'"
      @input="settings.background = { type: 'color', color: ($event.target as HTMLInputElement).value }" />
    <input ref="backgroundInput" type="file" accept="image/*" hidden @change="selectBackground" />
    <Teleport to="body">
      <div v-if="contextOpen && settings" ref="contextPopover" :style="contextStyles" class="preview-context"
        role="menu" :aria-label="t('preview.options')" @contextmenu.prevent @keydown="onPreviewKeydown"
        @keydown.esc.stop="closeContext">
        <button type="button" role="menuitem" :disabled="!layers.length" @mouseenter="submenu = null"
          @click="fitCharacter(); closeContext()" aria-keyshortcuts="F">
          <Maximize :size="16" /><span>{{ t('preview.fit') }}</span><kbd>F</kbd>
        </button>
        <button type="button" role="menuitem" :disabled="!layers.length" @mouseenter="submenu = null"
          @click="centerCharacter(); closeContext()" aria-keyshortcuts="C">
          <Focus :size="16" /><span>{{ t('preview.center') }}</span><kbd>C</kbd>
        </button>
        <button type="button" role="menuitem" :disabled="!layers.length" @mouseenter="submenu = null"
          @click="resetCamera(); closeContext()" aria-keyshortcuts="R">
          <RotateCcw :size="16" /><span>{{ t('preview.resetCamera') }}</span><kbd>R</kbd>
        </button>


        <template v-if="minigameAvailable">
          <button type="button" role="menuitemcheckbox" :aria-checked="minigameEnabled" @mouseenter="submenu = null"
            @click="minigameEnabled = !minigameEnabled; closeContext()">
            <Hand :size="16" /><span>{{ t('preview.minigameInteractions') }}</span>
            <Check v-if="minigameEnabled" :size="16" />
          </button>
          <template v-if="minigameEnabled">
            <button type="button" role="menuitemcheckbox" :aria-checked="minigameFever" :disabled="!minigameFeverAvailable"
              @mouseenter="submenu = null" @click="minigameFever = !minigameFever; closeContext()">
              <Flame :size="16" /><span>{{ t('preview.minigameFever') }}</span>
              <Check v-if="minigameFever" :size="16" />
            </button>
          </template>
          <div class="context-separator" />
        </template>
        <template v-if="isDating">
          <button type="button" role="menuitemcheckbox" :aria-checked="datingEnabled" @mouseenter="submenu = null"
            :disabled="!datingAvailable" @click="stopSequence(); datingEnabled = !datingEnabled; closeContext()">
            <Hand :size="16" /><span>{{ t('preview.datingInteractions') }}</span>
            <Check v-if="datingEnabled" :size="16" />
          </button>
          <button type="button" role="menuitemcheckbox" :aria-checked="showDatingPoints" :disabled="!datingEnabled"
            @mouseenter="submenu = null" @click="showDatingPoints = !showDatingPoints; closeContext()">
            <Eye :size="16" /><span>{{ t('preview.showInteractionPoints') }}</span>
            <Check v-if="showDatingPoints" :size="16" />
          </button>
          <button type="button" role="menuitemcheckbox" :aria-checked="showDatingAreas" :disabled="!datingEnabled"
            @mouseenter="submenu = null" @click="showDatingAreas = !showDatingAreas; closeContext()">
            <Eye :size="16" /><span>{{ t('preview.showInteractionAreas') }}</span>
            <Check v-if="showDatingAreas" :size="16" />
          </button>
          <template v-if="datingEnabled && datingTools.length > 1">
            <div class="context-separator" />
            <button v-for="item in datingTools" :key="item.id" type="button" role="menuitemradio"
              :aria-checked="datingTool === item.id" @click="selectDatingTool(item.id)">
              <Hand :size="16" /><span>{{ item.id === 0 ? t('preview.noTool') : t('preview.datingTool', { id: item.id })
              }}{{ item.skin ? ' (' + item.skin + ')' : '' }}</span>
              <Check v-if="datingTool === item.id" :size="16" />
            </button>
          </template>
        </template>
        <button type="button" role="menuitem" :disabled="skins.length < 2"
          :aria-haspopup="skins.length > 1 ? 'menu' : undefined" :aria-expanded="submenu === 'skin'"
          @mouseenter="openSubmenu('skin', $event)" @click="openSubmenu('skin', $event)">
          <Shirt :size="16" /><span>{{ skins.length > 1 ? t('preview.skin') : t('preview.skin') + ": " + (skins[0] ||
            t('preview.none')) }}</span>
          <ChevronRight v-if="skins.length > 1" :size="16" />
        </button>
        <button type="button" role="menuitem" aria-haspopup="menu" :aria-expanded="submenu === 'background'"
          @mouseenter="openSubmenu('background', $event)" @click="openSubmenu('background', $event)">
          <Image :size="16" /><span>{{ t('preview.background') }}</span>
          <ChevronRight :size="16" />
        </button>
        <div class="context-separator" />
        <button type="button" role="menuitem" :disabled="!allAnimations.length" @mouseenter="submenu = null"
          @click="closeContext(); openSequence(null)" aria-keyshortcuts="Shift+S">
          <Plus :size="16" /><span>{{ t('preview.createSequence') }}</span><kbd>Shift+S</kbd>
        </button>
      </div>
      <div v-if="contextOpen && submenu && settings" ref="submenuPopover" :style="submenuStyles" class="preview-context"
        role="menu" :aria-label="submenu === 'background' ? t('preview.background') : t('preview.skin')"
        @contextmenu.prevent @keydown="onPreviewKeydown" @keydown.esc.stop="closeContext">
        <template v-if="submenu === 'background'">
          <button type="button" role="menuitem" @click="colorInput?.click(); closeContext()">
            <Palette :size="16" /><span>{{ t('preview.selectColor') }}</span>
          </button>
          <button type="button" role="menuitem" @click="backgroundInput?.click(); closeContext()">
            <Image :size="16" /><span>{{ t('preview.selectImage') }}</span>
          </button>
          <button type="button" role="menuitem" @click="settings.background = { type: 'theme' }; closeContext()">
            <RotateCcw :size="16" /><span>{{ t('preview.resetBackground') }}</span>
          </button>
          <template v-if="source?.type === 'folder'">
            <div class="context-separator" />
            <p class="background-heading">{{ t('preview.modBackgrounds') }}</p>
            <p v-if="backgroundsLoading" class="background-message" role="status">{{ t('preview.loading') }}</p>
            <p v-else-if="backgroundsError" class="background-message" role="alert">{{ t('preview.backgroundsFailed') }}
            </p>
            <p v-else-if="!modBackgrounds.length" class="background-message">{{ t('preview.noBackgrounds') }}</p>
            <div v-else class="mod-backgrounds">
              <button v-for="[name, image] in modBackgrounds" :key="name" type="button" role="menuitemradio"
                :aria-checked="settings.background.type === 'image' && settings.background.path === image" :title="name"
                @click="settings.background = { type: 'image', path: image }; closeContext()">
                <img :src="image" alt="" loading="lazy" /><span>{{ name }}</span>
                <Check v-if="settings.background.type === 'image' && settings.background.path === image" :size="16" />
              </button>
            </div>
          </template>
        </template>
        <template v-else>
          <button v-for="name in skins" :key="name" type="button" role="menuitemradio" :aria-checked="skin === name"
            @click="skin = name; closeContext()">{{ name }}
            <Check v-if="skin === name" :size="14" />
          </button>
        </template>
      </div>
    </Teleport>
    <div v-if="source && settings" class="preview-playback">
      <button type="button" :aria-label="t(datingEnabled ? 'preview.resetDating' : 'preview.restart')" :title="t(datingEnabled ? 'preview.resetDating' : 'preview.restart')"
        :disabled="!allAnimations.length" @click="restart">
        <RotateCcw v-if="datingEnabled" :size="16" aria-hidden="true" />
        <SkipBack v-else :size="16" aria-hidden="true" />
      </button>
      <button type="button" :aria-label="paused ? t('preview.playPreview') : t('preview.pausePreview')"
        :title="paused ? t('preview.play') : t('preview.pause')" :disabled="!allAnimations.length"
        @click="paused = !paused">
        <Play v-if="paused" :size="16" aria-hidden="true" />
        <Pause v-else :size="16" aria-hidden="true" />
      </button>
      <button v-if="!datingEnabled && !minigameEnabled" type="button" :aria-label="t('preview.loop')" :title="t('preview.loop')" :aria-pressed="loopAnimation"
        :disabled="!allAnimations.length" @click="loopAnimation = !loopAnimation">
        <Repeat :size="16" aria-hidden="true" />
      </button>
      <input v-if="!datingEnabled && !minigameEnabled" type="range" min="0" :max="duration" step="0.01" :value="playbackTime" :disabled="!duration"
        :aria-label="t('preview.progress')" :title="`${playbackTime.toFixed(2)} / ${duration.toFixed(2)} s`"
        @input="seek" />

      <template v-if="datingEnabled">
        <select :value="datingGroup?.id" :aria-label="t('preview.datingStageLabel')"
          @change="selectDatingGroup(Number(($event.target as HTMLSelectElement).value))">
          <option v-for="(item, index) in datingGroups" :key="item.id" :value="item.id">
            {{ t('preview.datingStage', { number: index + 1 }) }}
          </option>
        </select>
        <span class="dating-playback-space"></span>
        <button type="button" class="dating-areas" :aria-label="t('preview.showInteractionPoints')" :title="t('preview.showInteractionPoints')"
          :aria-pressed="showDatingPoints"
          @click="showDatingPoints = !showDatingPoints">
          <Eye :size="16" aria-hidden="true" /><span class="playback-label">{{ t('preview.showInteractionPoints') }}</span>
        </button>
        <button type="button" class="dating-areas" :aria-label="t('preview.showInteractionAreas')" :title="t('preview.showInteractionAreas')"
          :aria-pressed="showDatingAreas"
          @click="showDatingAreas = !showDatingAreas">
          <Scan :size="16" aria-hidden="true" /><span class="playback-label">{{ t('preview.showInteractionAreas') }}</span>
        </button>
        <select v-if="datingTools.length > 1" class="dating-tool-select" :value="datingTool" :aria-label="t('preview.datingToolLabel')"
          @change="selectDatingTool(Number(($event.target as HTMLSelectElement).value))">
          <option v-for="item in datingTools" :key="item.id" :value="item.id">
            {{ item.id === 0 ? t('preview.noTool') : t('preview.datingTool', { id: item.id }) }}
          </option>
        </select>
      </template>
      <span v-else-if="minigameEnabled" class="minigame-hint">{{ t('preview.minigameHint') }}</span>
      <button v-if="isDating" type="button" :aria-pressed="datingEnabled"
        :aria-disabled="!datingAvailable" class="dating-interactions-button" :aria-label="t('preview.datingInteractions')" :title="t('preview.datingInteractions')"
        @mouseenter="keepDatingTooltip(); datingButton = $event.currentTarget as HTMLElement; datingTooltipOpen = !uiStore.isSupporter" @mouseleave="closeDatingTooltip()"
        @focus="keepDatingTooltip(); datingButton = $event.currentTarget as HTMLElement; datingTooltipOpen = !uiStore.isSupporter" @blur="closeDatingTooltip()"
        @keydown.esc="datingTooltipOpen = false"
        @click="datingAvailable && (stopSequence(), datingEnabled = !datingEnabled)">
        <Hand :size="16" aria-hidden="true" /><span class="playback-label">{{ t('preview.datingInteractions') }}</span>
      </button>
      <button v-if="minigameAvailable" type="button" :aria-pressed="minigameEnabled"
        class="dating-interactions-button" :aria-label="t('preview.minigameInteractions')" :title="t('preview.minigameInteractions')"
        @click="minigameEnabled = !minigameEnabled">
        <Hand :size="16" aria-hidden="true" /><span class="playback-label">{{ t('preview.minigameInteractions') }}</span>
      </button>
      <button v-if="datingEnabled && datingTools.length > 1" ref="datingToolsButton" type="button"
        class="dating-tool-button" :aria-label="t('preview.datingToolLabel')" :title="t('preview.datingToolLabel')"
        :aria-expanded="datingToolsOpen" @click="datingToolsOpen = !datingToolsOpen">
        <Ellipsis :size="16" aria-hidden="true" />
      </button>
      <Teleport to="body">
        <div v-if="datingEnabled && datingToolsOpen" ref="datingToolsPopover" :style="datingToolsStyles"
          class="preview-animation-options dating-tool-options" role="dialog" :aria-label="t('preview.datingToolLabel')"
          @keydown.esc="datingToolsOpen = false; datingToolsButton?.focus()">
          <button v-for="item in datingTools" :key="item.id" type="button" :aria-pressed="datingTool === item.id"
            @click="selectDatingTool(item.id); datingToolsOpen = false; datingToolsButton?.focus()">
            <span>{{ item.id === 0 ? t('preview.noTool') : t('preview.datingTool', { id: item.id }) }}</span>
            <Check v-if="datingTool === item.id" :size="16" aria-hidden="true" />
          </button>
        </div>
      </Teleport>
      <button v-if="!datingEnabled && !minigameEnabled" ref="animationButton" type="button" class="preview-animation-select"
        :aria-label="t('preview.previewAnimation')" aria-haspopup="dialog" :aria-expanded="animationsOpen"
        :disabled="!allAnimations.length || datingEnabled || minigameEnabled" @click="animationsOpen = !animationsOpen; layersOpen = false"
        @keydown.esc="animationsOpen = false">
        <ChevronDown :size="16" aria-hidden="true" />
        <span>{{ (cutsceneActive ? t('preview.gameCutscene') : activeSequence?.name) || animationSelection ||
          t('preview.global', {
            animation: previewerStore.globalAnimation || allAnimations[0] ||
              t('preview.noAnimation')
          })
        }}
        </span>
      </button>

      <Teleport to="body">
        <div v-if="isDating && datingTooltipOpen && !uiStore.isSupporter" ref="datingTooltip"
          :style="datingTooltipStyles" class="dating-support-tooltip" role="dialog" :aria-label="t('preview.datingInteractions')"
          @mouseenter="keepDatingTooltip()" @mouseleave="closeDatingTooltip()"
          @focusin="keepDatingTooltip()" @focusout="closeDatingTooltip()" @keydown.esc="datingTooltipOpen = false">
          {{ t('preview.datingSupportMessage') }}
          <div class="dating-support-links">
            <button type="button" @click="openUrl('https://ko-fi.com/bruhnn')">
              Ko-fi<ExternalLink :size="12" aria-hidden="true" />
            </button>
            <button type="button" @click="openUrl('https://afdian.com/a/bruhnn')">
              AFDIAN<ExternalLink :size="12" aria-hidden="true" />
            </button>
          </div>
        </div>
      </Teleport>

      <Teleport to="body">
        <div v-if="animationsOpen" ref="animationPopover" :style="animationStyles" class="preview-animation-options"
          role="dialog" :aria-label="t('preview.previewAnimation')"
          @keydown.esc="animationsOpen = false; animationButton?.focus()">
          <button type="button" :aria-pressed="!cutsceneActive && !activeSequence && animationSelection === ''"
            @click="animationSelection = ''">
            <span>{{ t('preview.global', {
              animation: previewerStore.globalAnimation || allAnimations[0] ||
                t('preview.noAnimation')
            }) }}</span>
            <Check v-if="!cutsceneActive && !activeSequence && animationSelection === ''" :size="16"
              aria-hidden="true" />
          </button>
          <button v-for="animation in allAnimations" :key="animation" type="button"
            :aria-pressed="!cutsceneActive && !activeSequence && animationSelection === animation"
            @click="animationSelection = animation">
            <span>{{ animation }}</span>
            <Check v-if="!cutsceneActive && !activeSequence && animationSelection === animation" :size="16"
              aria-hidden="true" />
          </button>
          <button v-if="cutsceneAvailable" type="button" :aria-pressed="cutsceneActive" @click="playGameCutscene">
            <span>{{ t('preview.gameCutscene') }}</span>
            <Check v-if="cutsceneActive" :size="16" aria-hidden="true" />
          </button>
          <div class="sequence-options">
            <div v-for="(sequence, index) in sequences" :key="index" class="sequence-row">
              <button type="button" :aria-pressed="activeSequence === sequence" @click="playSequence(sequence)">
                <span>{{ sequence.name }}</span>
                <Check v-if="activeSequence === sequence" :size="16" aria-hidden="true" />
              </button>
              <button type="button" class="sequence-action" :aria-label="t('preview.edit', { name: sequence.name })"
                @click="openSequence(index)">
                <Pencil :size="14" />
              </button>
              <button type="button" class="sequence-action" :aria-label="t('preview.delete', { name: sequence.name })"
                @click="deleteSequence(index)">
                <Trash2 :size="14" />
              </button>
            </div>
            <button type="button" @click="openSequence(null)"><span>{{ t('preview.createSequence') }}</span>
              <Plus :size="16" aria-hidden="true" />
            </button>
          </div>
        </div>
      </Teleport>
      <button ref="layersButton" type="button" :aria-label="t('preview.previewLayers')"
        :title="t('preview.previewLayers')" :aria-expanded="layersOpen" :disabled="!layers.length"
        @click="layersOpen = !layersOpen; animationsOpen = false">
        <Layers :size="16" aria-hidden="true" />
      </button>
      <Teleport to="body">
        <div v-if="layersOpen" ref="layersPopover" :style="layerStyles" class="preview-tracks preview-layers"
          role="dialog" :aria-label="t('preview.layers') + ': ' + title"
          @keydown.esc="layersOpen = false; layersButton?.focus()">
          <div class="preview-tracks-title">
            <span>{{ t('preview.layers') }}</span>
            <div class="layer-actions">
              <button type="button" class="preview-close-button" :title="t('preview.showAllLayers')"
                :aria-label="t('preview.showAllLayers')" @click="hiddenLayers = []">
                <Eye :size="16" aria-hidden="true" />
              </button>
              <button type="button" class="preview-close-button" :title="t('preview.hideAllLayers')"
                :aria-label="t('preview.hideAllLayers')" @click="hiddenLayers = [...layers]">
                <EyeOff :size="16" aria-hidden="true" />
              </button>
              <button type="button" class="preview-close-button" :title="t('preview.resetLayers')"
                :aria-label="t('preview.resetLayers')"
                @click="hiddenLayers = []; layerSearch = ''; highlightedLayer = ''">
                <RotateCcw :size="16" aria-hidden="true" />
              </button>
              <button type="button" class="preview-close-button" :title="t('preview.closeLayers')"
                :aria-label="t('preview.closeLayers')" @click="layersOpen = false; layersButton?.focus()">
                <X :size="16" aria-hidden="true" />
              </button>
            </div>
          </div>
          <input v-model="layerSearch" type="search" class="preview-layer-search"
            :placeholder="t('preview.searchLayers')" :aria-label="t('preview.searchLayersLabel')" />
          <div class="preview-layer-list" @mouseleave="highlightedLayer = ''">
            <p v-if="!filteredLayers.length" class="layers-empty">{{ t('preview.noLayers') }}</p>
            <label v-for="layer in filteredLayers" :key="layer" class="preview-layer-row"
              @mouseenter="highlightedLayer = layer" @mouseleave="highlightedLayer = ''">
              <input type="checkbox" :checked="!hiddenLayers.includes(layer)" @focus="highlightedLayer = layer"
                @blur="highlightedLayer = ''"
                @change="hiddenLayers.includes(layer) ? hiddenLayers.splice(hiddenLayers.indexOf(layer), 1) : hiddenLayers.push(layer)" />
              <span>{{ layer }}</span>
            </label>
          </div>
        </div>
      </Teleport>
    </div>

  </div>
</template>

<style scoped>
.preview-titlebar-action:disabled {
  opacity: .4;
  cursor: default;
}

.background-heading,
.background-message {
  padding: 6px 18px;
  color: var(--text-secondary);
}

.background-heading {
  font-weight: 500;
}

.mod-backgrounds {
  max-height: 240px;
  max-width: 340px;
  overflow-y: auto;
}

.mod-backgrounds button {
  min-height: 48px;
}

.mod-backgrounds img {
  width: 48px;
  height: 32px;
  object-fit: contain;
  flex-shrink: 0;
  border-radius: 3px;
  background: var(--surface-input);
}

.mod-backgrounds button>span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-panel {
  container-type: inline-size;
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.preview-panel.dragging {
  opacity: .6;
}

.preview-titlebar {
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border-bottom-width: 1px;
}

.mod-toggle {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.preview-checkbox {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 2px;
  border-width: 1px;
  cursor: pointer;
}

.preview-checkbox:disabled {
  opacity: .4;
  cursor: not-allowed;
}

.preview-checkbox:focus-visible {
  outline-width: 2px;
  outline-style: solid;
  outline-offset: 2px;
}

.checkbox-tick {
  position: absolute;
  left: 3px;
  pointer-events: none;
  display: none;
}

.preview-checkbox:checked+.checkbox-tick {
  display: block;
}

.cutscene-warning {
  position: absolute;
  top: 40px;
  left: 12px;
  right: 12px;
  margin: 0;
  padding: 6px 8px;
  background: var(--surface-panel);
  color: var(--text-secondary);
  font-size: 12px;
  pointer-events: none;
}

.mod-error,
.preview-name {
  font-size: 12px;
  line-height: 16px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.mod-error {
  color: var(--text-secondary);
}

.preview-name {
  flex: 1;
  min-width: 0;
}

.preview-titlebar-action {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  padding: 6px;
  border-radius: 2px;
  cursor: pointer;
}

.preview-grip {
  cursor: grab;
  touch-action: none;
}

.preview-grip:active {
  cursor: grabbing;
}

.empty-preview {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  color: var(--text-secondary);
}

.empty-content {
  margin: auto;
  width: 100%;
  max-width: 560px;
}

.empty-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-default);
}

.empty-title {
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  color: var(--text-primary);
}

.open-folder {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 12px;
  line-height: 16px;
  border-radius: 4px;
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  cursor: pointer;
}

.open-folder:hover,
.error-button:hover {
  background: var(--state-hover);
}

.open-folder:disabled {
  opacity: .5;
}

.recent-section {
  margin-top: 12px;
}

.recent-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 0;
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
}

.recent-toggle:hover {
  color: var(--accent);
}

.recent-toggle .collapsed {
  transform: rotate(-90deg);
}

.recent-count {
  margin-left: auto;
  font-size: 12px;
  line-height: 16px;
  font-weight: 400;
  color: var(--text-muted);
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-error {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  text-align: center;
}

.error-title {
  font-size: 14px;
  line-height: 20px;
  color: var(--text-primary);
}

.error-details {
  font-size: 12px;
  line-height: 16px;
  color: var(--text-secondary);
  overflow-wrap: break-word;
}

.error-actions {
  display: flex;
  gap: 8px;
}

.error-button {
  padding: 8px 12px;
  font-size: 12px;
  line-height: 16px;
  border-radius: 4px;
  border: 1px solid var(--border-default);
}

.preview-loading {
  padding: 8px 16px;
  font-size: 12px;
  line-height: 16px;
  color: var(--text-secondary);
}

.player-container {
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}

.layers-empty {
  color: var(--text-secondary);
  padding: 8px 0;
}

.sequence-row {
  display: flex;
  align-items: center;
}

.sequence-row>button:first-child {
  flex: 1;
  min-width: 0;
}

.preview-animation-options .sequence-action {
  width: 28px;
  flex-shrink: 0;
  justify-content: center;
  padding: 6px;
}

.sequence-options {
  border-top: 1px solid var(--border-default);
  margin-top: 4px;
  padding-top: 4px;
}

.preview-panel {
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: 7px;
}

.preview-titlebar {
  background: var(--surface-panel);
  color: var(--text-primary);
  border-color: var(--border-default);
}

.preview-checkbox {
  background: var(--surface-input);
  border-color: var(--border-default);
  outline-color: var(--accent);
}

.preview-checkbox:hover {
  border-color: var(--state-hover);
}

.preview-checkbox:checked {
  background: var(--accent);
  border-color: transparent;
}

.preview-titlebar-action {
  color: var(--text-secondary);
}

.preview-titlebar-action:hover {
  background: var(--state-hover);
  color: var(--text-primary);
}

.preview-sync-groups {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.preview-sync-groups .preview-titlebar-action {
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.preview-sync-groups .preview-titlebar-action[aria-pressed="true"] {
  background: var(--accent);
  color: var(--text-on-accent);
}

.preview-playback {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  padding: 5px 8px;
  background: var(--surface-panel);
  color: var(--text-primary);
}

.preview-playback button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  padding: 5px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.dating-playback-space {
  flex: 1;
}

.preview-playback .dating-areas,
.preview-playback .dating-interactions-button {
  width: auto;
  gap: 6px;
  padding: 5px 8px;
  font-size: 12px;
}

.preview-playback .dating-tool-button,
.preview-sync-select {
  display: none;
}

.preview-sync-select {
  width: 58px;
  height: 28px;
  flex-shrink: 0;
  padding: 0 4px;
  border: 1px solid var(--border-default);
  border-radius: 3px;
  background: var(--surface-input);
  color: var(--text-secondary);
  font-size: 12px;
}

.dating-tool-options {
  min-width: 140px;
}


.preview-playback button:hover {
  background: var(--state-hover);
}

.preview-playback button[aria-pressed="true"] {
  background: var(--state-hover);
  color: var(--accent);
}

.preview-playback svg {
  width: 16px;
  height: 16px;
}

.preview-playback input {
  flex: 1;
  min-width: 35px;
  width: 0;
  accent-color: var(--accent);
}

.preview-playback select {
  flex: 0 1 125px;
  width: 125px;
  min-width: 0;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--border-default);
  border-radius: 3px;
  background: var(--surface-input);
  color: inherit;
  font-size: 12px;
}

.preview-playback :disabled {
  opacity: .5;
  cursor: default;
}

.preview-playback button[aria-expanded="true"] {
  color: var(--accent);
}

.preview-tracks {
  z-index: 100;
  width: 290px;
  max-width: calc(100vw - 16px);
  max-height: calc(100vh - 16px);
  overflow-y: auto;
  padding: 12px;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--surface-popover);
  color: var(--text-primary);
  font-size: 12px;
}

.preview-tracks-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
}

.preview-playback .preview-animation-select {
  flex: 0 1 125px;
  width: 125px;
  min-width: 0;
  padding: 0 8px;
  border: 1px solid var(--border-default);
  background: var(--surface-input);
  gap: 6px;
  font-size: 12px;
}

.preview-animation-select span {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.preview-animation-select svg {
  flex-shrink: 0;
}

.preview-animation-options {
  z-index: 100;
  width: max-content;
  min-width: 180px;
  max-width: min(320px, calc(100vw - 16px));
  max-height: min(300px, calc(100vh - 16px));
  overflow-y: auto;
  padding: 4px;
  border: 1px solid var(--border-default);
  border-radius: 4px;
  background: var(--surface-popover);
  color: var(--text-primary);
  font-size: 12px;
}

.preview-animation-options button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 30px;
  padding: 6px 8px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.preview-animation-options button span {
  overflow-wrap: anywhere;
  min-width: 0;
}

.preview-animation-options button svg {
  flex-shrink: 0;
}

.preview-animation-options button:hover {
  background: var(--state-hover);
}

.preview-animation-options button[aria-pressed="true"] {
  color: var(--accent);
}

.preview-layers {
  display: flex;
  flex-direction: column;
  max-height: min(360px, calc(100vh - 16px));
  overflow: hidden;
}

.preview-layers>.preview-tracks-title,
.preview-layer-search {
  flex-shrink: 0;
}

.layer-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.preview-layer-row:hover {
  background: var(--state-hover);
}

.preview-layer-list {
  min-height: 0;
  overflow-y: auto;
}

.preview-layer-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  cursor: pointer;
}

.preview-layer-row input {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
  cursor: pointer;
}

.preview-layer-row span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.preview-layer-search {
  width: 100%;
  height: 30px;
  margin-bottom: 8px;
  padding: 0 8px;
  border: 1px solid var(--border-default);
  border-radius: 3px;
  background: var(--surface-input);
  color: var(--text-primary);
  font: inherit;
}

.preview-layer-search:focus {
  outline: 1px solid var(--accent);
}

.preview-layer-search::placeholder {
  color: var(--text-muted);
}

.preview-drop-target {
  position: fixed;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  border: 1px solid var(--accent);
  border-radius: 4px;
  background: var(--surface-popover);
  color: var(--accent);
}

.preview-context {
  z-index: 110;
  min-width: 260px;
  max-width: calc(100vw - 16px);
  max-height: calc(100vh - 16px);
  overflow-y: auto;
  padding: 8px 0;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  background: var(--surface-popover);
  color: var(--text-primary);
  box-shadow: 0 8px 24px rgb(0 0 0 / .22);
  font-size: 12px;
}

.preview-context button {
  display: flex;
  align-items: center;
  gap: 12px;
  width: calc(100% - 12px);
  min-height: 28px;
  margin: 0 6px;
  padding: 6px 12px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: 16px;
  cursor: pointer;
  text-align: left;
}

.preview-context button>span {
  flex: 1;
}

.preview-context button>svg {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  stroke-width: 1.75;
  color: var(--text-secondary);
}

.preview-context kbd {
  margin-left: auto;
  color: var(--text-secondary);
  font: inherit;
  font-size: 11px;
  white-space: nowrap;
}

.preview-context button:hover:not(:disabled),
.preview-context button[aria-expanded="true"] {
  background: var(--state-hover);
}

.preview-context button:disabled {
  opacity: .5;
  cursor: default;
}

.preview-context :focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: -1px;
}

.context-separator {
  margin: 8px 0;
  border-top: 1px solid var(--border-default);
}

.preview-titlebar .dating-interactions-button {
  width: auto;
  gap: 6px;
  padding: 5px 8px;
  font-size: 12px;
  white-space: nowrap;
}

.preview-titlebar .dating-interactions-button[aria-pressed="true"] {
  color: var(--accent);
  background: var(--state-hover);
}

.preview-titlebar .dating-interactions-button[aria-disabled="true"],
.preview-playback .dating-interactions-button[aria-disabled="true"] {
  color: var(--text-secondary);
  cursor: default;
}

.dating-support-tooltip {
  z-index: 10000;
  width: 300px;
  max-width: calc(100vw - 16px);
  padding: 12px;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--surface-popover);
  color: var(--text-primary);
  font-size: 12px;
  line-height: 1.5;
  pointer-events: auto;
}

.dating-support-links {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.dating-support-links button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--accent);
  font: inherit;
  cursor: pointer;
}

.dating-support-links button:hover {
  text-decoration: underline;
}

.minigame-hint {
  flex: 1;
  min-width: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.dating-gauge {
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid var(--border-default);
  border-radius: 4px;
  background: var(--surface-popover);
  color: var(--text-primary);
  font-size: 12px;
  pointer-events: none;
}

.dating-gauge progress {
    width: 6px;
    height: 100px;
    writing-mode: vertical-lr;
    direction: rtl;
    appearance: none;
    border: none;
    background: transparent;
}

.dating-gauge progress::-webkit-progress-bar {
    background: var(--surface-input);
    border-radius: 3px;
}

.dating-gauge progress::-webkit-progress-value {
    background: var(--accent);
    border-radius: 3px;
}
@container (max-width: 760px) {
  .preview-playback {
    gap: 4px;
    padding: 5px 6px;
  }

  .preview-playback .playback-label,
  .preview-playback .dating-tool-select,
  .dating-playback-space {
    display: none;
  }

  .preview-playback .dating-areas,
  .preview-playback .dating-interactions-button {
    width: 30px;
    padding: 5px;
  }

  .preview-playback .dating-tool-button {
    display: inline-flex;
  }

  .preview-playback select {
    flex: 1;
    width: 0;
  }
}

@container (max-width: 480px) {
  .preview-sync-groups {
    display: none;
  }

  .preview-sync-select {
    display: block;
  }

  .preview-titlebar {
    gap: 4px;
    padding: 0 6px;
  }
}

@container (max-width: 360px) {
  .preview-playback {
    gap: 2px;
  }

  .preview-playback button {
    width: 28px;
  }

  .preview-playback .dating-areas,
  .preview-playback .dating-interactions-button {
    width: 28px;
  }
}


@container (max-width: 280px) {
  .preview-titlebar {
    height: auto;
    min-height: 36px;
    flex-wrap: wrap;
    padding-top: 4px;
    padding-bottom: 4px;
  }

  .preview-name {
    min-width: 40px;
  }

  .preview-playback {
    flex-wrap: wrap;
  }

  .preview-playback select,
  .preview-playback .preview-animation-select {
    min-width: 65px;
  }
}
</style>
<style scoped>
.preview-stage {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.dating-markers {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.dating-point-layer {
  position: absolute;
  inset: 0;
}

.dating-point-fade-enter-active,
.dating-point-fade-leave-active {
  transition: opacity .15s ease-out;
}

.dating-point-fade-enter-from,
.dating-point-fade-leave-to {
  opacity: 0;
}

.dating-marker-scale {
  position: absolute;
  width: 0;
  height: 0;
  transform-origin: 0 0;
}

.dating-area {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  box-sizing: border-box;
  border: 1px dashed color-mix(in srgb, currentColor 75%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, currentColor 10%, transparent);
}

.dating-marker {
  position: absolute;
  width: 0;
  height: 0;
  color: inherit;
  opacity: .6;
  transition: opacity .15s ease-out;
}

.dating-marker.hovered,
.dating-marker.pressed,
.dating-marker.dragging {
  opacity: 1;
}

.dating-marker-motion {
  position: absolute;
  width: 0;
  height: 0;
  transition: transform .2s ease-out;
}

.dating-marker.dragging .dating-marker-motion { transition: none; }

.dating-marker-dot-position {
  position: absolute;
  width: 5px;
  height: 5px;
  transform: translate(-50%, -50%);
}

.dating-marker-dot {
  display: block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 4px 1px color-mix(in srgb, currentColor 70%, transparent), 0 0 10px 3px color-mix(in srgb, currentColor 25%, transparent);
}

.dating-marker-dot.pop { animation: dating-dot-pop .4s ease-out; }

.dating-marker-ring {
  position: absolute;
  width: 22px;
  height: 22px;
  box-sizing: border-box;
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(1);
  border: 1px solid color-mix(in srgb, currentColor 85%, transparent);
  box-shadow: 0 0 8px 1px color-mix(in srgb, currentColor 55%, transparent), inset 0 0 6px color-mix(in srgb, currentColor 35%, transparent);
  transition: transform .3s cubic-bezier(.34, 1.9, .5, 1), border-color .15s, box-shadow .15s, opacity .2s;
}

.dating-marker.pressed .dating-marker-ring {
  transform: translate(-50%, -50%) scale(.8);
  border-color: inherit;
  box-shadow: 0 0 12px 3px color-mix(in srgb, currentColor 80%, transparent), inset 0 0 8px color-mix(in srgb, currentColor 60%, transparent);
}

.dating-marker.dragging .dating-marker-ring {
  opacity: 0;
  transform: translate(-50%, -50%) scale(.3);
}

.dating-marker-ripple {
  position: absolute;
  width: 22px;
  height: 22px;
  box-sizing: border-box;
  border-radius: 50%;
  border: 2px solid currentColor;
  box-shadow: 0 0 10px 2px color-mix(in srgb, currentColor 70%, transparent);
  animation: dating-ripple .6s cubic-bezier(.1, .7, .2, 1) both;
}

.dating-marker-arrow-axis,
.dating-marker-arrow-gap {
  position: absolute;
  width: 0;
  height: 0;
}

.dating-marker-arrow-gap {
  transform: translateX(16px);
  transition: transform .25s cubic-bezier(.3, 1.6, .5, 1), opacity .12s, filter .15s;
}

.dating-marker-arrow {
  position: absolute;
  width: 6px;
  height: 10px;
  max-width: none;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 0 3px color-mix(in srgb, currentColor 80%, transparent));
}

.dating-marker.dragging .dating-marker-arrow-gap {
  transform: translateX(24px);
  animation: dating-nudge 1.2s ease-in-out .3s infinite;
}

@keyframes dating-dot-pop {
  0%, 100% { transform: scale(1); }
  30% { transform: scale(1.8); }
}

@keyframes dating-ripple {
  from { opacity: 1; transform: translate(-50%, -50%) scale(.9); border-width: 2px; }
  to { opacity: 0; transform: translate(-50%, -50%) scale(2.4); border-width: .5px; }
}

@keyframes dating-nudge {
  0%, 100% { transform: translateX(24px); }
  50% { transform: translateX(calc(24px - 1.5px)); }
}
</style>

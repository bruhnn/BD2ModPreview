<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from "vue"
import { Ellipsis, EllipsisVertical, Plus } from "@lucide/vue"
import { saveWindowState, StateFlags } from '@tauri-apps/plugin-window-state'
import { UnlistenFn } from '@tauri-apps/api/event'
import { getCurrentWebview } from '@tauri-apps/api/webview'

import { updateCutscenes } from "./utils/cutsceneData"

import { usePreviewDrag } from './composables/usePreviewDrag'

import { useI18n } from "vue-i18n"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { getMatches } from '@tauri-apps/plugin-cli'

import { usePreviewerStore } from "./stores/previewer.ts"
import { useCharactersStore } from "./stores/characters"
import { useModManagerStore } from "./stores/modManager"
import { useUIStore } from "./stores/ui"
import { useLogger } from "./composables/useLogger"
import Toolbar from "./components/Toolbar.vue"
import Settings from "./components/modals/Settings.vue"
import WhatsNew from "./components/modals/WhatsNew.vue"
import Preview from "./components/Preview.vue"
import Logging from "./components/modals/Logging.vue"
import History from "./components/modals/History.vue"
import CharactersList from "./components/CharactersList.vue"

// [TODO] move to rust
saveWindowState(StateFlags.ALL)

let unlistenDragDrop: UnlistenFn | undefined
const { logMessage, clearLogs } = useLogger()
const uiStore = useUIStore()
const modManager = useModManagerStore()
const charactersStore = useCharactersStore()
const previewerStore = usePreviewerStore()
const { t } = useI18n()

const isCharacterListVisible = ref(false)
const charactersWidth = ref(40)
const charactersResize = ref<{ start: number, width: number } | null>(null)

function startCharactersResize(event: PointerEvent) {
  if (event.button !== 0) return
  charactersResize.value = { start: event.clientX, width: charactersWidth.value }
  const handle = event.currentTarget as HTMLElement
  handle.setPointerCapture(event.pointerId)
  event.preventDefault()
}

function moveCharactersResize(event: PointerEvent) {
  if (!charactersResize.value) return
  charactersWidth.value = Math.max(20, Math.min(80, charactersResize.value.width + (charactersResize.value.start - event.clientX) / window.innerWidth * 100))
}

const { dropTarget: folderDropTarget, moveDrag: moveFolderDrag, cancelDrag: cancelFolderDrag } = usePreviewDrag(() => {}, true)

async function initializeDragAndDrop(): Promise<void> {
  try {
    unlistenDragDrop = await getCurrentWebview().onDragDropEvent(event => {
      const payload = event.payload

      if (payload.type === 'leave') {
        cancelFolderDrag()
        return
      }

      moveFolderDrag({
        clientX: payload.position.x / window.devicePixelRatio,
        clientY: payload.position.y / window.devicePixelRatio,
      }, true)

      if (payload.type !== 'drop') return

      const target = folderDropTarget.value

      cancelFolderDrag()

      if (!target) return

      for (const [index, path] of payload.paths.entries()) {
        // [TODO] check if we need this opendroppedrpeview or only openpreview
        previewerStore.openDroppedPreview(
          path.split(/[\\/]/).filter(Boolean).pop() || path,
          { type: "folder", path },
          index === 0 ? target : { row: target.row, column: target.column + index, newRow: false },
        )
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

    const themeArg: string | null = typeof matches.args.theme?.value === 'string' ? matches.args.theme.value : null
    const langArg : string | null = typeof matches.args.language?.value === 'string' ? matches.args.language.value : null

    if (themeArg && ['dark-1', 'dark-2', 'dark-3', 'dark-4', 'light-1', 'light-2'].includes(themeArg)) {
      uiStore.theme = themeArg
    }


    if (langArg) {
      uiStore.language = langArg
    }

    const pathArg = matches.args.path?.value

    const paths = Array.isArray(pathArg) ? pathArg : typeof pathArg === 'string' ? [pathArg] : []
    for (const path of paths) {
      if (typeof path !== 'string' || !path) continue
      previewerStore.openPreview(path.split(/[\\/]/).filter(Boolean).pop() || path, { type: "folder", path })
    }
  } catch (error) {
    logMessage(`Error processing CLI arguments: ${error}`, 'error')
  }
}

const previewRows = computed(() => {
  const rows = [...new Set(previewerStore.previewers.map(p => p.pos.row))].sort((a, b) => a - b)
  return rows.map(row => ({
    row,
    previews: previewerStore.previewers
      .filter(p => p.pos.row === row)
      .sort((a, b) => a.pos.column - b.pos.column),
  }))
})

const rowSizes = ref<number[]>([])
const columnSizes = ref<Record<number, number[]>>({})

let resize: { axis: "row" | "column", row: number, index: number, start: number, length: number, sizes: number[] } | null = null

watch(() => previewRows.value.map(row => row.previews.map(p => p.id).join(",")).join(";"), () => {
  rowSizes.value = previewRows.value.map(() => 1)
  columnSizes.value = Object.fromEntries(previewRows.value.map(row => [row.row, row.previews.map(() => 1)]))
  resize = null
}, { immediate: true })

function startResize(event: PointerEvent, axis: "row" | "column", index: number, row = 0) {
  if (event.button !== 0) return
  const handle = event.currentTarget as HTMLElement
  const container = handle.closest(axis === "row" ? "#preview-grid" : ".preview-row")!
  const panels = container.querySelectorAll(axis === "row" ? ":scope > .preview-row" : ":scope > .preview-cell")
  const length = Array.from(panels).reduce((total, panel) => {
    const bounds = panel.getBoundingClientRect()
    return total + (axis === "row" ? bounds.height : bounds.width)
  }, 0)
  resize = {
    axis, row, index,
    start: axis === "row" ? event.clientY : event.clientX,
    length,
    sizes: [...(axis === "row" ? rowSizes.value : columnSizes.value[row])],
  }
  handle.setPointerCapture(event.pointerId)
  event.preventDefault()
}

function moveResize(event: PointerEvent) {
  if (!resize) return
  const { axis, row, index, start, length, sizes } = resize
  const delta = ((axis === "row" ? event.clientY : event.clientX) - start) / length * sizes.reduce((a, b) => a + b, 0)
  const pair = sizes[index] + sizes[index + 1]
  const first = Math.max(pair * .1, Math.min(pair * .9, sizes[index] + delta))
  const target = axis === "row" ? rowSizes.value : columnSizes.value[row]
  target[index] = first
  target[index + 1] = pair - first
}

onMounted(async () => {
  clearLogs()

  logMessage('Application starting...')

  await loadFromCli()
  await uiStore.loadLanguage()

  // these functions we dont need to wait because they are not critical for the app to start, but we want to run them in parallel to save time
  void Promise.allSettled([
    initializeDragAndDrop(),
    modManager.initialize(),
    charactersStore.loadCharacters(),
    updateCutscenes(),
    uiStore.checkSupporter().catch(error => {
      logMessage(`Failed to check supporter access: ${error}`, "error")
    })
  ])

  await uiStore.shouldShowWhatsNew()

  if (previewerStore.previewers.length === 0) {
    previewerStore.openPreview(t('preview.newPreview'))
  }

  await nextTick()

  await getCurrentWindow().show()

  logMessage('Application initialized successfully.', "success")
})

onUnmounted(() => {
  modManager.dispose()
  unlistenDragDrop?.()
  cancelFolderDrag()
  logMessage('Application cleaned up')
})
</script>

<template>
  <div id="app">
    <Teleport to="body">
      <div v-if="folderDropTarget" class="folder-drop-target" :style="{
          left: folderDropTarget.left + 'px', top: folderDropTarget.top + 'px',
          width: folderDropTarget.width + 'px', height: folderDropTarget.height + 'px',
        }">
        <Plus :size="18" />
      </div>
    </Teleport>

    <!-- #modals> -->
    <Logging :show="uiStore.isLogsVisible" @close="uiStore.closeLogs" />
    <History :show="uiStore.isHistoryVisible" @close="uiStore.closeHistory" />
    <WhatsNew :show="uiStore.isWhatsNewVisible" @close="uiStore.closeWhatsNew" />
    <!-- modals# -->

    <main id="main">
      <Toolbar :characters-open="isCharacterListVisible" @characters="isCharacterListVisible = !isCharacterListVisible" />

      <div id="workspace">
        <div id="content">
            <div id="preview-grid" :style="{
              gridTemplateRows: rowSizes.map(size => `minmax(0, ${size}fr)`).join(' '),
            }">
              <div v-for="(row, rowIndex) in previewRows" :key="row.row" class="preview-row"
                :style="{ gridTemplateColumns: (columnSizes[row.row] || row.previews.map(() => 1)).map(size => `minmax(0, ${size}fr)`).join(' ') }">
                <div v-for="(preview, columnIndex) in row.previews" :key="preview.id" class="preview-cell">
                  <Preview :preview-id="preview.id" :can-add-right="columnIndex === row.previews.length - 1"
                    :can-add-bottom="rowIndex === previewRows.length - 1" />
                  <div v-if="columnIndex < row.previews.length - 1" class="resize-divider resize-column"
                    :title="t('preview.resize')" role="separator" aria-orientation="vertical"
                    @pointerdown="startResize($event, 'column', columnIndex, row.row)" @pointermove="moveResize"
                    @pointerup="resize = null" @pointercancel="resize = null" @lostpointercapture="resize = null"
                    @dblclick="columnSizes[row.row][columnIndex] = columnSizes[row.row][columnIndex + 1] = 1">
                    <EllipsisVertical :size="12" />
                  </div>
                </div>
                <div v-if="rowIndex < previewRows.length - 1" class="resize-divider resize-row" :title="t('preview.resize')"
                  role="separator" aria-orientation="horizontal" @pointerdown="startResize($event, 'row', rowIndex)"
                  @pointermove="moveResize" @pointerup="resize = null" @pointercancel="resize = null"
                  @lostpointercapture="resize = null" @dblclick="rowSizes[rowIndex] = rowSizes[rowIndex + 1] = 1">
                  <Ellipsis :size="12" />
                </div>
              </div>
            </div>
        </div>
      </div>
    </main>

    <Transition name="characters">
      <aside v-show="isCharacterListVisible" id="characters-list" :aria-label="t('preview.characters')"
        :style="{ '--characters-width': `${charactersWidth}vw` }">
        <div class="resize-divider resize-characters" :title="t('preview.resize')" role="separator"
          :aria-label="t('preview.resizeCharacters')" aria-orientation="vertical" @pointerdown="startCharactersResize"
          @pointermove="moveCharactersResize" @pointerup="charactersResize = null"
          @pointercancel="charactersResize = null" @lostpointercapture="charactersResize = null">
          <EllipsisVertical :size="12" aria-hidden="true" />
        </div>
        <div id="characters-content">
          <CharactersList :visible="isCharacterListVisible" />
        </div>
      </aside>
    </Transition>
    <Settings :show="uiStore.isSettingsVisible" @close="uiStore.closeSettings" />
  </div>
</template>

<style scoped>
.folder-drop-target { position: fixed; z-index: 200; display: flex; align-items: center; justify-content: center; pointer-events: none; border: 1px solid var(--accent); border-radius: 4px; background: var(--surface-popover); color: var(--accent); }

#main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

#workspace {
  display: flex;
  flex: 1;
  min-height: 0;
  position: relative;
}

#content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

#characters-list {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 0 0 var(--characters-width);
  min-width: 0;
  min-height: 0;
  border-left: 1px solid var(--border-default);
  overflow: hidden;
  background: var(--surface-panel);
}

#characters-content {
  flex: 1;
  width: var(--characters-width);
  min-height: 0;
  overflow: hidden;
}

#characters-list.characters-enter-active,
#characters-list.characters-leave-active {
  transition: flex-basis 200ms ease-out, transform 200ms ease-out;
}

#characters-list.characters-enter-from,
#characters-list.characters-leave-to {
  flex-basis: 0;
  transform: translateX(100%);
  border-left-width: 0;
}

@media (prefers-reduced-motion: reduce) {

  #characters-list.characters-enter-active,
  #characters-list.characters-leave-active {
    transition: none;
  }
}

#preview-grid {
  display: grid;
  gap: 8px;
  padding: 8px;
  width: 100%;
  height: 100%;
}

.preview-row {
  position: relative;
  display: grid;
  gap: 8px;
  min-width: 0;
  min-height: 0;
}

.preview-cell {
  position: relative;
  min-width: 0;
  min-height: 0;
}

.resize-divider {
  position: absolute;
  z-index: 10;
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.resize-divider::before {
  content: '';
  position: absolute;
  background: var(--border-default);
  opacity: 0;
  transition: opacity 120ms ease-out;
}

.resize-column::before,
.resize-characters::before {
  top: 0;
  bottom: 0;
  width: 2px;
}

.resize-row::before {
  left: 0;
  right: 0;
  height: 3px;
}

.resize-divider svg {
  position: relative;
  flex-shrink: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 120ms ease-out;
}

.resize-column svg,
.resize-characters svg {
  box-sizing: content-box;
  padding: 4px 0;
}

.resize-row svg {
  box-sizing: content-box;
  padding: 0 6px;
}

#characters-list .resize-characters {
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
}

.resize-column {
  right: -7px;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
}

.resize-row {
  left: 0;
  right: 0;
  bottom: -7px;
  height: 6px;
  cursor: row-resize;
}

.resize-divider:hover::before,
.resize-divider:active::before {
  /* background: var(--accent); */
  opacity: 0;
}

.resize-divider:hover svg,
.resize-divider:active svg {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {

  .resize-divider::before,
  .resize-divider svg {
    transition: none;
  }
}
</style>
<script
  setup
  lang="ts"
>
import { ExternalLink, RotateCcw, Bug, Check, ChevronDown, ChevronRight, CircleQuestionMark, Heart, ScrollText, Sparkles, X } from "@lucide/vue"
import { Dialog, DialogPanel, DialogTitle, Menu, MenuButton, MenuItems, MenuItem, TransitionRoot, TransitionChild } from '@headlessui/vue'
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { openUrl } from '@tauri-apps/plugin-opener'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { getVersion } from "@tauri-apps/api/app"

import { useUIStore } from '../../stores/ui'
import { useGameBackgroundStore } from '../../stores/gameBackgrounds'
import { usePreviewerStore } from '../../stores/previewer'
import { useLogger } from '../../composables/useLogger'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ close: [] }>()
const uiStore = useUIStore()
const previewerStore = usePreviewerStore()
const gameBackgrounds = useGameBackgroundStore()
const { availableLocales, t, te } = useI18n()
const { logMessage } = useLogger()

const appVersion = ref('0.0.0')

const alwaysOnTop = ref(false)
const orderNumber = ref('')
const redeeming = ref(false)
const redeemMessage = ref('')

const languages: Record<string, string> = {
  en_US: 'English', zh_CN: '简体中文', ja_JP: '日本語', ko_KR: '한국어',
}

async function redeem() {
  if (redeeming.value || !orderNumber.value.trim()) return
  redeeming.value = true
  redeemMessage.value = ''
  try {
    const machineId = await uiStore.loadMachineId()
    const response = await fetch('https://shy-waterfall-2797.bruhnn.workers.dev/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: orderNumber.value.trim(), machineId }),
    })
    const data = await response.json()
    if (!response.ok || data.ok !== true) {
      const key = `supporter.errors.${data.error}`
      redeemMessage.value = te(key) ? key : 'supporter.errors.activationFailed'
      return
    }
    orderNumber.value = ''
    redeemMessage.value = 'supporter.activated'
    try {
      await uiStore.checkSupporter()
    } catch {
      redeemMessage.value = 'supporter.activatedRefreshFailed'
    }
  } catch {
    redeemMessage.value = 'supporter.errors.connectionFailed'
  } finally {
    redeeming.value = false
  }
}

async function changeAlwaysOnTop(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  try {
    await getCurrentWindow().setAlwaysOnTop(checked)
    alwaysOnTop.value = checked
  } catch (error) {
    (event.target as HTMLInputElement).checked = alwaysOnTop.value
    logMessage(`Failed to set always on top: ${error}`, 'error')
  }
}

function openLogs() {
  emit('close')
  uiStore.openLogs()
}

function formatSize(bytes: number) {
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

async function openIssues() {
  try {
    await openUrl('https://github.com/bruhnn/BD2ModManager/issues')
  } catch (error) {
    logMessage(`Failed to open GitHub issues: ${error}`, 'error')
  }
}

onMounted(async () => {
  getVersion().then((v) => {
    appVersion.value = v
  })
})

watch(() => props.show, async (show) => {
  if (show) {
    gameBackgrounds.refreshCacheSize()
    alwaysOnTop.value = await getCurrentWindow().isAlwaysOnTop()
  }
})
</script>

<template>
  <TransitionRoot :show="show" as="template">
    <Dialog class="settings-modal" @close="$emit('close')">
      <TransitionChild as="template" enter="dialog-enter" enter-from="dialog-hidden" enter-to="dialog-visible"
        leave="dialog-leave" leave-from="dialog-visible" leave-to="dialog-hidden">
        <div class="settings-backdrop" />
      </TransitionChild>

      <div class="settings-container">
        <TransitionChild as="template" enter="dialog-enter" enter-from="panel-hidden" enter-to="panel-visible"
          leave="dialog-leave" leave-from="panel-visible" leave-to="panel-hidden">

          <DialogPanel class="settings-panel">
            <header>
              <DialogTitle>{{ t('preview.settings') }}</DialogTitle>
              <button type="button" class="preview-close-button" :aria-label="t('preview.closeSettings')"
                @click="$emit('close')">
                <X :size="16" />
              </button>
            </header>
            <div class="settings-content">
              <div class="settings-columns">
                <section>
                  <h3>{{ t('preview.application') }}</h3>
                  <label class="settings-field">
                    <span>{{ t('preview.theme') }}</span>
                    <select v-model="uiStore.theme">
                      <option v-for="theme in ['dark-1', 'dark-2', 'dark-3', 'dark-4', 'light-1', 'light-2']"
                        :key="theme" :value="theme">
                        {{ t(theme.startsWith('dark') ? 'preview.darkTheme' : 'preview.lightTheme', {
                          number:
                            theme.split('-')[1]
                        }) }}
                      </option>
                    </select>
                  </label>
                  <label class="settings-field">
                    <span>{{ t('controls.appSettings.language') }}</span>
                    <select v-model="uiStore.language">
                      <option v-for="lang in availableLocales" :key="lang" :value="lang">{{ languages[lang] || lang }}
                      </option>
                    </select>
                  </label>
                  <label class="settings-check">
                    <input type="checkbox" :checked="alwaysOnTop" @change="changeAlwaysOnTop" />
                    <span>{{ t('controls.appSettings.alwaysOnTop') }}<small>{{ t('preview.onTopHelp') }}</small></span>
                  </label>
                </section>
                <section>
                  <h3>{{ t('preview.rendering') }}</h3>
                  <label class="settings-check">
                    <input v-model="uiStore.minigameAudio" type="checkbox" />
                    <span>{{ t('minigameAudio') }}</span>
                  </label>

                  <label class="settings-check">
                    <input v-model="previewerStore.premultipliedAlpha"
                      @update:model-value="previewerStore.setPremultipliedAlpha" type="checkbox" />
                    <span>{{ t('controls.render.premultipliedAlpha') }}<small>{{ t('preview.alphaHelp')
                    }}</small></span>
                  </label>
                </section>
              </div>
              <section class="dating-point-settings">
                <h3>{{ t('preview.datingInteractions') }}</h3>
                <label class="settings-check">
                  <input v-model="uiStore.datingAudio" type="checkbox" />
                  <span>{{ t('datingAudio') }}</span>
                </label>
                <label class="point-setting">
                  <span>{{ t('datingPointSettings.click') }}<small>{{ t('datingPointSettings.colorHelp')
                  }}</small></span>
                  <input v-model="uiStore.datingPointStyle.clickColor" type="color" />
                </label>
                <label class="point-setting">
                  <span>{{ t('datingPointSettings.drag') }}<small>{{ t('datingPointSettings.colorHelp')
                  }}</small></span>
                  <input v-model="uiStore.datingPointStyle.dragColor" type="color" />
                </label>
                <label class="point-setting">
                  <span>{{ t('datingPointSettings.size') }}<small>{{ t('datingPointSettings.sizeHelp') }}</small></span>
                  <span class="point-size-control">
                    <input v-model.number="uiStore.datingPointStyle.size" type="range" min="50" max="200" step="5"
                      :style="{ '--point-size-progress': `${(uiStore.datingPointStyle.size - 50) / 150 * 100}%` }" />
                    <output>{{ uiStore.datingPointStyle.size }}%</output>
                  </span>
                </label>
                <button type="button" class="point-reset"
                  @click="uiStore.datingPointStyle = { clickColor: '#ffffff', dragColor: '#ffffff', size: 100 }">
                  <RotateCcw :size="16" />{{ t('datingPointSettings.reset') }}
                </button>
              </section>
              <section class="game-background-settings">
                <h3>{{ t('gameBackgroundSettings.title') }}</h3>
                <label class="settings-check">
                  <input v-model="gameBackgrounds.showByDefault" type="checkbox" />
                  <span>{{ t('gameBackgroundSettings.show') }}<small>{{ t('gameBackgroundSettings.showHelp') }}</small></span>
                </label>
                <label class="settings-field">
                  <span>{{ t('gameBackgroundSettings.mode') }}</span>
                  <select v-model="gameBackgrounds.mode">
                    <option value="ask">{{ t('gameBackgroundSettings.ask') }}</option>
                    <option value="always">{{ t('gameBackgroundSettings.always') }}</option>
                  </select>
                </label>
                <div class="background-cache">
                  <span>{{ t('gameBackgroundSettings.cache', { size: formatSize(gameBackgrounds.cacheSize) }) }}</span>
                  <button type="button" :disabled="!gameBackgrounds.cacheSize" @click="gameBackgrounds.clearCache()">{{
                    t('gameBackgroundSettings.clear') }}</button>
                </div>
              </section>
              <section v-if="uiStore.isSupporter" class="supporter-section">
                <div class="supporter-heading">
                  <span class="supporter-title">
                    <Heart :size="17" />{{ t('supporter.title') }}
                  </span>
                  <span class="supporter-active">
                    <Check :size="17" />{{ t('supporter.active') }}
                  </span>
                </div>
                <p>{{ t('supporter.thankYou') }}</p>
              </section>
              <details v-else class="supporter-section">
                <summary>
                  <div>
                    <span class="supporter-title">
                      <Heart :size="17" />{{ t('supporter.title') }}
                    </span>
                    <p>{{ t('supporter.description') }}</p>
                  </div>
                  <ChevronDown :size="17" class="supporter-chevron" />
                </summary>
                <div class="supporter-links">
                  <button type="button" @click="openUrl('https://ko-fi.com/bruhnn')">
                    Ko-fi
                    <ExternalLink :size="12" aria-hidden="true" />
                  </button>
                  <button type="button" @click="openUrl('https://afdian.com/a/bruhnn')">
                    AFDIAN
                    <ExternalLink :size="12" aria-hidden="true" />
                  </button>
                </div>
                <form class="supporter-form" @submit.prevent="redeem">
                  <label for="supporter-order">{{ t('supporter.orderNumber') }}</label>
                  <div class="supporter-input-row">
                    <input id="supporter-order" v-model="orderNumber" type="text" autocomplete="off"
                      :placeholder="t('supporter.placeholder')" aria-describedby="supporter-result"
                      :disabled="redeeming" />
                    <button type="submit" :disabled="redeeming || !orderNumber.trim()">{{ t(redeeming ?
                      'supporter.redeeming' : 'supporter.redeem') }}</button>
                  </div>
                  <p id="supporter-result" role="status">{{ redeemMessage ? t(redeemMessage) : '' }}</p>
                  <details class="supporter-help">
                    <summary>
                      <ChevronRight :size="14" />{{ t('supporter.findOrder') }}
                    </summary>
                    <p>{{ t('supporter.orderHelp') }}</p>
                  </details>
                </form>
              </details>
            </div>
            <footer class="settings-footer">
              <span class="app-version">
                v{{ appVersion }}
              </span>
              <div class="footer-actions">
                <button type="button" @click="openLogs">
                  <ScrollText :size="16" />
                  {{ t('controls.actions.openLogs') }}
                </button>
                <Menu as="div" class="help-menu">
                  <MenuButton>
                    <CircleQuestionMark class="size-4" />
                    {{ t('preview.help') }}
                  </MenuButton>
                  <MenuItems class="help-items">
                    <MenuItem v-slot="{ active }">
                      <button :class="{ active }" @click="openIssues">
                        <Sparkles class="size-4" />
                        {{ t('controls.links.suggestFeature') }}
                      </button>
                    </MenuItem>
                    <MenuItem v-slot="{ active }">
                      <button :class="{ active }" @click="openIssues">
                        <Bug class="size-4" />
                        {{ t('controls.links.reportIssue') }}
                      </button>
                    </MenuItem>
                  </MenuItems>
                </Menu>
              </div>
            </footer>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<style scoped>
:global(.settings-modal) {
  position: relative;
  z-index: 10000;
  color: var(--text-primary);
  font-size: 14px;
}

.settings-backdrop {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / .55);
}

.settings-container {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: hidden;
}

.settings-panel {
  display: flex;
  flex-direction: column;
  max-height: min(90vh, calc(100vh - 40px));
  overflow: hidden;
  width: 650px;
  max-width: 100%;
  background: var(--surface-app);
  border: 1px solid var(--border-default);
  border-radius: 8px;
}

header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
}

header h2 {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
}

.settings-content {
  min-height: 0;
  overflow-y: auto;
}

.settings-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 32px;
  padding: 4px 24px 24px;
}

h3 {
  font-size: 14px;
  font-weight: 500;
  margin: 0 0 14px;
}

.settings-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 12px 0;
}

select {
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--border-default);
  border-radius: 4px;
  background: var(--surface-input);
  color: var(--text-primary);
  font: inherit;
}

.settings-check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  cursor: pointer;
}

.settings-check input {
  width: 20px;
  height: 20px;
  margin: 0;
  flex-shrink: 0;
  accent-color: var(--accent);
}

.settings-check small {
  display: block;
  margin-top: 3px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 550px) {
  .settings-columns {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

.supporter-section {
  margin: 0 0 24px;
  padding: 18px 24px 0;
  border-top: 1px solid var(--border-default);
}

.supporter-section summary {
  display: flex;
  align-items: center;
  gap: 8px;
  list-style: none;
  cursor: pointer;
}

.supporter-section summary::-webkit-details-marker {
  display: none;
}

.supporter-section>summary {
  justify-content: space-between;
}

.supporter-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.supporter-active {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
  font-size: 12px;
}

.supporter-title {
  display: flex;
  align-items: center;
  gap: 9px;
  font-weight: 500;
}

.supporter-title svg {
  color: var(--accent);
}

.supporter-section svg {
  flex-shrink: 0;
}

.supporter-section[open]>summary .supporter-chevron {
  transform: rotate(180deg);
}

.supporter-section p {
  margin: 5px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.supporter-links {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
}

.supporter-links button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--accent);
  font-size: 12px;
  cursor: pointer;
}

.supporter-links button:hover {
  text-decoration: underline;
}

.supporter-form {
  margin-top: 16px;
}

.supporter-form>label {
  display: block;
  margin-bottom: 7px;
  color: var(--text-secondary);
  font-size: 12px;
}

.supporter-input-row {
  display: flex;
  gap: 8px;
}

.supporter-input-row input {
  flex: 1;
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--border-default);
  border-radius: 4px;
  background: var(--surface-input);
  color: var(--text-primary);
  font: inherit;
}

.supporter-input-row button {
  padding: 0 12px;
  border: 1px solid var(--accent);
  border-radius: 4px;
  background: var(--accent);
  color: var(--text-on-accent);
  font: inherit;
  cursor: pointer;
}

.supporter-input-row button:disabled {
  opacity: .5;
  cursor: default;
}

.supporter-help {
  margin-top: 12px;
  color: var(--text-secondary);
  font-size: 12px;
}

.supporter-help[open]>summary svg {
  transform: rotate(90deg);
}

.supporter-help p {
  margin: 8px 0 0 22px;
}

.settings-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 16px;
  border-top: 1px solid var(--border-default);
}

.footer-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.settings-footer button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 30px;
  padding: 0 8px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.settings-footer button:hover,
.settings-footer button.active {
  background: var(--state-hover);
}

.settings-footer svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.help-menu {
  position: relative;
  flex-shrink: 0;
}

.help-items {
  position: absolute;
  bottom: calc(100% + 5px);
  right: 0;
  width: max-content;
  min-width: 200px;
  max-width: calc(100vw - 64px);
  padding: 4px;
  border: 1px solid var(--border-default);
  border-radius: 5px;
  background: var(--surface-popover);
  box-shadow: 0 4px 12px rgb(0 0 0 / .25);
  z-index: 1;
}

.help-items button {
  width: 100%;
  min-height: 32px;
  height: auto;
  padding: 7px 8px;
  text-align: left;
}

.dialog-enter {
  transition: opacity 300ms ease-out, transform 300ms ease-out;
}

.dialog-leave {
  transition: opacity 200ms ease-in, transform 200ms ease-in;
}

.dialog-hidden {
  opacity: 0;
}

.dialog-visible {
  opacity: 1;
}

.panel-hidden {
  opacity: 0;
  transform: scale(.95);
}

.panel-visible {
  opacity: 1;
  transform: scale(1);
}

.app-version {
  font-size: 12px;
  color: var(--text-secondary)
}

.dating-point-settings,
.game-background-settings {
  padding: 0 24px 24px;
}

.background-cache {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 12px;
}

.background-cache button {
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--border-default);
  border-radius: 4px;
  background: var(--surface-input);
  color: var(--text-primary);
  font: inherit;
  cursor: pointer;
}

.background-cache button:disabled {
  opacity: .5;
  cursor: default;
}

.point-setting {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(100px, 150px);
  align-items: center;
  gap: 16px;
  margin: 16px 0;
}

.point-setting small {
  display: block;
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 12px;
}

.point-setting input[type="color"] {
  width: 100%;
  height: 32px;
  padding: 3px;
  border: 1px solid var(--border-default);
  border-radius: 4px;
  background: var(--surface-input);
}

.point-size-control {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.point-size-control input {
  flex: 1;
  width: 0;
  min-width: 0;
  height: 16px;
  margin: 0;
  appearance: none;
  background: transparent;
}

.point-size-control input::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(to right, var(--accent) var(--point-size-progress), var(--border-strong) var(--point-size-progress));
}

.point-size-control input::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(to right, var(--accent) var(--point-size-progress), var(--border-strong) var(--point-size-progress));
}

.point-size-control input::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  margin-top: -5px;
  border: 0;
  border-radius: 50%;
  background: var(--accent);
}

.point-size-control input::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border: 0;
  border-radius: 50%;
  background: var(--accent);
}

.point-size-control output {
  min-width: 36px;
  text-align: right;
  font-size: 12px;
}

.point-reset {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.point-reset:hover {
  color: var(--text-primary);
}
</style>
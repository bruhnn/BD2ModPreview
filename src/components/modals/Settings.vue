<script
  setup
  lang="ts"
>
import { Bug, CircleQuestionMark, ScrollText, Sparkles, X } from "@lucide/vue"
import { Dialog, DialogPanel, DialogTitle, Menu, MenuButton, MenuItems, MenuItem, TransitionRoot, TransitionChild } from '@headlessui/vue'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { openUrl } from '@tauri-apps/plugin-opener'
import { getCurrentWindow } from '@tauri-apps/api/window'

import { useUIStore } from '../../stores/ui'
import { usePreviewerStore } from '../../stores/previewer'
import { useLogger } from '../../composables/useLogger'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ close: [] }>()
const uiStore = useUIStore()
const previewerStore = usePreviewerStore()
const { availableLocales, t } = useI18n()
const { logMessage } = useLogger()

const alwaysOnTop = ref(false)

const languages: Record<string, string> = {
  en: 'English', pt: 'Português', es: 'Español', fr: 'Français',
  de: 'Deutsch', zh: '中文', ja: '日本語', ko: '한국어', ru: 'Русский',
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

async function openIssues() {
  try {
    await openUrl('https://github.com/bruhnn/BD2ModPreview/issues')
  } catch (error) {
    logMessage(`Failed to open GitHub issues: ${error}`, 'error')
  }
}

async function copyMachineId() {
  if (!navigator.clipboard) {
    logMessage('Clipboard API not available', 'error')
    return
  }

  if (!uiStore.machineId) {
    logMessage('Machine ID is not available', 'error')
    return
  }
  try {
    await navigator.clipboard.writeText(uiStore.machineId)
    logMessage('Machine ID copied to clipboard', 'info')
  } catch (error) {
    logMessage(`Failed to copy Machine ID: ${error}`, 'error')
  }
}

watch(() => props.show, async (show) => {
  if (show) alwaysOnTop.value = await getCurrentWindow().isAlwaysOnTop()
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
            <div class="settings-columns">
              <section>
                <h3>{{ t('preview.application') }}</h3>
                <label class="settings-field">
                  <span>{{ t('preview.theme') }}</span>
                  <select v-model="uiStore.theme">
                    <option v-for="theme in ['dark-1', 'dark-2', 'dark-3', 'dark-4', 'light-1', 'light-2']" :key="theme"
                      :value="theme">
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
                  <input v-model="previewerStore.premultipliedAlpha"
                    @update:model-value="previewerStore.setPremultipliedAlpha" type="checkbox" />
                  <span>{{ t('controls.render.premultipliedAlpha') }}<small>{{ t('preview.alphaHelp') }}</small></span>
                </label>
              </section>
            </div>
            <footer class="settings-footer">
              <span v-if="uiStore.machineId" class="machine-id" @click="copyMachineId" title="Copy to Clipboard">
                {{ uiStore.machineId }}
                <!-- show a mesg whe copied -->
              </span>
              <span v-else class="machine-id">
                {{ $t("app.machineIdNotFound") }}
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
.settings-modal {
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
  overflow-y: auto;
}

.settings-panel {
  width: 650px;
  max-width: 100%;
  background: var(--surface-app);
  border: 1px solid var(--border-default);
  border-radius: 8px;
}

header {
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

.settings-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 16px;
  border-top: 1px solid var(--border-default);
}

.footer-actions {
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

.machine-id {
  display: inline;
  /* padding: 4px 8px; */
  /* border-radius: 3px; */
  /* background: var(--surface-input); */
  color: var(--text-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 40%;
  white-space: nowrap;
  transition: color 0.2s ease-in-out;
  user-select: none;
}

.machine-id::before {
  content: 'ID: ';
  font-weight: 400;
}

.machine-id:hover {
  color: var(--text-primary);
  cursor: pointer;
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
</style>

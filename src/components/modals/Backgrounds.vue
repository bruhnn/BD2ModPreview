<script
  setup
  lang="ts"
>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { RefreshCw, RotateCcw, Search, X } from '@lucide/vue'

import { useNetworkStatus } from '../../composables/useNetworkStatus'
import { usePreviewerStore } from '../../stores/previewer'
import { useUIStore } from '../../stores/ui'
import { NOVEL_BACKGROUNDS, novelThumbnail, loadNovelBackground } from '../../data/novelBackgrounds'
import NoInternetState from '../NoInternetState.vue'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const previewerStore = usePreviewerStore()
const uiStore = useUIStore()
const { isConnected, isChecking, checkConnection } = useNetworkStatus()

const search = ref('')
const loading = ref(false)
const failed = ref<number | null>(null)

watch(() => props.show, (show) => {
  if (!show) return
  search.value = ''
  failed.value = null
  checkConnection()
})

const backgrounds = computed(() => {
  const text = search.value.trim().replace(/^#/, '')
  return text ? NOVEL_BACKGROUNDS.filter(id => String(id).includes(text)) : NOVEL_BACKGROUNDS
})

async function apply(id: number | null) {
  loading.value = true
  const url = id === null ? null : await loadNovelBackground(id)
  loading.value = false
  if (id !== null && !url) {
    failed.value = id
    checkConnection()
    return
  }
  failed.value = null
  const background = url ? { type: 'image' as const, path: url } : { type: 'theme' as const }
  for (const preview of previewerStore.previewers)
    if (!uiStore.backgroundsTarget || preview.id === uiStore.backgroundsTarget) preview.settings.background = background
  emit('close')
}
</script>

<template>
  <TransitionRoot :show="show" as="template" enter="dialog-enter" enter-from="dialog-hidden" enter-to="dialog-visible"
    leave="dialog-leave" leave-from="dialog-visible" leave-to="dialog-hidden">
    <Dialog as="div" class="backgrounds-modal" @close="emit('close')">
      <TransitionChild as="template" enter="dialog-enter" enter-from="dialog-hidden" enter-to="dialog-visible"
        leave="dialog-leave" leave-from="dialog-visible" leave-to="dialog-hidden">
        <div class="backgrounds-backdrop" />
      </TransitionChild>

      <div class="backgrounds-container">
        <TransitionChild as="template" enter="dialog-enter" enter-from="panel-hidden" enter-to="panel-visible"
          leave="dialog-leave" leave-from="panel-visible" leave-to="panel-hidden">
          <DialogPanel class="backgrounds-panel">
            <div class="backgrounds-header">
              <DialogTitle class="backgrounds-title">{{ t('backgroundsPanel.title') }}</DialogTitle>
              <button type="button" class="backgrounds-close" :aria-label="t('common.close')" @click="emit('close')">
                <X :size="16" aria-hidden="true" />
              </button>
            </div>

            <div class="backgrounds-tools">
              <label class="backgrounds-search">
                <Search :size="16" aria-hidden="true" />
                <input v-model="search" type="search" :placeholder="t('backgroundsPanel.search')"
                  :aria-label="t('backgroundsPanel.search')" />
              </label>
              <button type="button" class="backgrounds-reset" :disabled="loading" @click="apply(null)">
                <RotateCcw :size="16" aria-hidden="true" />{{ t('backgroundsPanel.reset') }}
              </button>
            </div>
            <div v-if="failed !== null && isConnected" class="backgrounds-error" role="alert">
              <span>{{ t('backgroundsPanel.failed', { number: failed }) }}</span>
              <button type="button" :disabled="loading" @click="apply(failed)">
                <RefreshCw :size="14" aria-hidden="true" />{{ t('common.retry') }}
              </button>
            </div>
            <p class="backgrounds-hint">
              {{ uiStore.backgroundsTarget ? t('backgroundsPanel.hintOne') : t('backgroundsPanel.hintAll') }}
            </p>

            <div class="backgrounds-scroll scrollbar">
              <NoInternetState v-if="!isConnected" :is-checking="isChecking" @check-connection="checkConnection" />
              <p v-else-if="!backgrounds.length" class="backgrounds-empty">{{ t('backgroundsPanel.none') }}</p>
              <div v-else class="backgrounds-grid">
                <button v-for="id in backgrounds" :key="id" type="button" class="background-item"
                  :disabled="loading"
                  :aria-label="t('backgroundsPanel.item', { number: id })"
                  :title="t('backgroundsPanel.item', { number: id })" @click="apply(id)">
                  <img loading="lazy" draggable="false" :src="novelThumbnail(id)" alt="" />
                  <span>{{ id }}</span>
                </button>
              </div>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<style scoped>
:global(.backgrounds-modal) {
  position: relative;
  z-index: 10000;
  color: var(--text-primary);
  font-size: 14px;
}

.backgrounds-backdrop {
  position: fixed;
  z-index: 10000;
  inset: 0;
  background: rgb(0 0 0 / .55);
}

.backgrounds-container {
  position: fixed;
  z-index: 10000;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.backgrounds-panel {
  display: flex;
  flex-direction: column;
  width: 860px;
  max-width: 100%;
  height: min(640px, calc(100vh - 40px));
  background: var(--surface-app);
  border: 1px solid var(--border-default);
  border-radius: 8px;
}

.backgrounds-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 16px 20px 10px;
}

.backgrounds-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.backgrounds-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.backgrounds-close:hover {
  color: var(--text-primary);
}

.backgrounds-tools {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  padding: 0 20px;
}

.backgrounds-search {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 8px;
  min-width: 0;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--border-default);
  border-radius: 4px;
  background: var(--surface-input);
  color: var(--text-secondary);
}

.backgrounds-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
}

.backgrounds-reset {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--border-default);
  border-radius: 4px;
  background: var(--surface-input);
  color: var(--text-primary);
  font: inherit;
  cursor: pointer;
}

.backgrounds-reset:disabled,
.background-item:disabled {
  cursor: default;
  opacity: .6;
}

.backgrounds-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
  margin: 10px 20px 0;
  padding: 8px 10px;
  border: 1px solid var(--error);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
}

.backgrounds-error button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--border-default);
  border-radius: 4px;
  background: var(--surface-input);
  color: var(--text-primary);
  font: inherit;
  cursor: pointer;
}

.backgrounds-hint {
  flex-shrink: 0;
  margin: 10px 20px;
  color: var(--text-secondary);
  font-size: 13px;
}

.backgrounds-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 20px 20px;
}

.backgrounds-empty {
  margin: 12px 0;
  color: var(--text-secondary);
}

.backgrounds-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

.background-item {
  position: relative;
  display: block;
  aspect-ratio: 1;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--surface-input);
  color: white;
  cursor: pointer;
}

.background-item img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.background-item span {
  position: absolute;
  right: 6px;
  bottom: 5px;
  padding: 0 5px;
  border-radius: 3px;
  background: rgb(0 0 0 / .55);
  font-size: 12px;
  line-height: 18px;
}

.background-item:not(:disabled):hover,
.background-item:focus-visible {
  border-color: var(--accent);
}
</style>

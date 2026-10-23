<script
  setup
  lang="ts"
>
import { Copy, Trash2, X } from "@lucide/vue"
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
  TransitionRoot,
  TransitionChild
} from '@headlessui/vue'

import { useLogger } from '../../composables/useLogger'

import { useClipboard } from '@vueuse/core'

const props = defineProps({
  show: Boolean
})
const emit = defineEmits(["close"])
const { logs, clearLogs } = useLogger()
const { copy } = useClipboard()

function handleCopy() {
  let stringLogs = (logs.value.map((item) => `${item.timestamp}  ${item.level.toUpperCase()}  ${item.message}`).join("\n"))
  copy(stringLogs)
}
</script>
<template>
  <TransitionRoot :show="show" as="template" enter="dialog-enter" enter-from="dialog-hidden" enter-to="dialog-visible"
    leave="dialog-leave" leave-from="dialog-visible" leave-to="dialog-hidden">
    <Dialog as="div" class="logs-modal" @close="$emit('close')">
      <TransitionChild as="template" enter="dialog-enter" enter-from="dialog-hidden" enter-to="dialog-visible"
        leave="dialog-leave" leave-from="dialog-visible" leave-to="dialog-hidden">
        <div class="logs-backdrop" />
      </TransitionChild>
      <div class="logs-container">
        <TransitionChild as="template" enter="dialog-enter" enter-from="panel-hidden" enter-to="panel-visible"
          leave="dialog-leave" leave-from="panel-visible" leave-to="panel-hidden">
          <DialogPanel class="logs-panel" :class="{ empty: logs.length == 0 }">
            <div class="logs-header">
              <DialogTitle class="logs-title">
                Logs
              </DialogTitle>
              <div class="logs-actions">
                <button @click="clearLogs" class="logs-action" type="button" title="Clear logs" aria-label="Clear logs">
                  <Trash2 :size="16" aria-hidden="true" />
                </button>
                <button @click="handleCopy" class="logs-action" type="button" title="Copy logs" aria-label="Copy logs">
                  <Copy :size="16" aria-hidden="true" />
                </button>
                <button type="button" aria-label="Close" class="preview-close-button" @click="$emit('close')">
                  <X :size="16" aria-hidden="true" />
                </button>
              </div>
            </div>
            <DialogDescription class="logs-content">
              <div v-if="logs.length > 0" ref="logsContent">
                <div v-for="log in logs" :key="log.timestamp" class="log-row">
                  <span class="log-time">
                    {{ log.timestamp }}
                  </span>
                  <span :class="{
                    'log-info': log.level === 'info',
                    'log-success': log.level === 'success',
                    'log-warning': log.level === 'warning',
                    'log-error': log.level === 'error'
                  }" class="log-level">
                    {{ log.level.toUpperCase() }}
                  </span>
                  <span class="log-message" :class="{
                    'log-error': log.level === 'error'
                  }">
                    {{ log.message }}
                  </span>
                </div>
              </div>
              <div v-else>
                <p class="logs-empty">No logs available.</p>
              </div>
            </DialogDescription>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
<style scoped>
.logs-modal {
  position: relative;
  z-index: 10000;
  color: var(--text-primary);
  font-size: 14px;
}

.logs-backdrop {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / .55);
}

.logs-container {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
}

.logs-panel {
  display: flex;
  flex-direction: column;
  width: 896px;
  max-width: 100%;
  max-height: calc(100vh - 40px);
  background: var(--surface-app);
  border: 1px solid var(--border-default);
  border-radius: 8px;
}

.logs-panel.empty {
  width: 512px;
}

.logs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 16px 20px;
}

.logs-title {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
}

.logs-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.log-row {
  display: flex;
  gap: 8px;
  line-height: 1.5;
}

.logs-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
}

.logs-action:hover {
  background: var(--state-hover);
}

.logs-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 24px 24px;
  color: var(--text-primary);
}

.log-time {
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.log-level {
  font-family: var(--font-mono);
  font-weight: 600;
  display: inline-block;
  width: 64px;
  text-align: center;
}

.log-message {
  flex: 1;
  color: var(--text-primary);
  word-break: break-all;
}

.log-info {
  color: var(--info);
}

.log-success {
  color: var(--success);
}

.log-warning {
  color: var(--warning);
}

.log-error {
  color: var(--error);
}

.logs-empty {
  color: var(--text-secondary);
  text-align: center;
  padding: 32px 0;
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

* {
  user-select: auto;
}
</style>
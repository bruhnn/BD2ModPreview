<script setup lang="ts">
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { Dialog, DialogPanel, DialogTitle, TransitionRoot } from "@headlessui/vue"
import { useGameBackgroundStore } from "../../stores/gameBackgrounds"

const { t } = useI18n()
const store = useGameBackgroundStore()
const remember = ref(false)

watch(() => store.prompt, () => (remember.value = false))

function size(bytes: number) {
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}
</script>

<template>
  <TransitionRoot :show="!!store.prompt" as="template">
    <Dialog class="background-prompt" @close="store.answer(false, false)">
      <div class="background-prompt-backdrop" />
      <div class="background-prompt-container">
        <DialogPanel v-if="store.prompt" class="background-prompt-panel">
          <DialogTitle>{{ t('gameBackgroundPrompt.title') }}</DialogTitle>
          <p>{{ t('gameBackgroundPrompt.message', { count: store.prompt.count, size: size(store.prompt.bytes) }) }}</p>
          <p class="background-prompt-hint">{{ t('gameBackgroundPrompt.hint') }}</p>
          <label class="background-prompt-remember">
            <input v-model="remember" type="checkbox" />
            <span>{{ t('gameBackgroundPrompt.remember') }}</span>
          </label>
          <div class="background-prompt-actions">
            <button type="button" @click="store.answer(false, remember)">{{ t('gameBackgroundPrompt.no') }}</button>
            <button type="button" class="primary" @click="store.answer(true, remember)">{{
              t('gameBackgroundPrompt.yes') }}</button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<style scoped>
:global(.background-prompt) {
  position: relative;
  z-index: 10001;
  color: var(--text-primary);
  font-size: 14px;
}

.background-prompt-backdrop {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / .55);
}

.background-prompt-container {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.background-prompt-panel {
  width: 420px;
  max-width: 100%;
  padding: 20px;
  background: var(--surface-app);
  border: 1px solid var(--border-default);
  border-radius: 8px;
}

.background-prompt-panel h2 {
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 500;
}

.background-prompt-panel p {
  margin: 0 0 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.background-prompt-panel p.background-prompt-hint {
  margin: 0 0 14px;
  font-size: 12.5px;
}

.background-prompt-remember {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.background-prompt-remember input {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--accent);
}

.background-prompt-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
}

.background-prompt-actions button {
  min-height: 32px;
  padding: 6px 14px;
  line-height: 1.3;
  white-space: normal;
  border: 1px solid var(--border-default);
  border-radius: 4px;
  background: var(--surface-input);
  color: var(--text-primary);
  font: inherit;
  cursor: pointer;
}

.background-prompt-actions button.primary {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--text-on-accent);
}
</style>

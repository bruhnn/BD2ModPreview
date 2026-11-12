<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useLocalStorage } from "@vueuse/core";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/vue";
import { Copy, X } from "@lucide/vue";
import type {
  ScreenshotInfo,
  ScreenshotMode,
  ScreenshotOptions,
} from "../../types/spine";

const props = defineProps<{
  info: ScreenshotInfo;
}>();

const emit = defineEmits<{
  close: [];
  save: [options: ScreenshotOptions];
  copy: [options: ScreenshotOptions];
}>();

const { t } = useI18n();

const saved = useLocalStorage<{
  mode: ScreenshotMode;
  transparent: boolean;
  width: number;
  height: number;
}>(
  "SCREENSHOT_OPTIONS",
  {
    mode: "full",
    transparent: false,
    width: props.info.width,
    height: props.info.height,
  },
  { mergeDefaults: true },
);

const modes: ScreenshotMode[] = ["full", "custom"];

const mode = computed({
  get: () => (modes.includes(saved.value.mode) ? saved.value.mode : "full"),
  set: (value) => (saved.value.mode = value),
});

const options = (): ScreenshotOptions => ({
  mode: mode.value,
  transparent: saved.value.transparent,
  width: saved.value.width,
  height: saved.value.height,
});
</script>

<template>
  <Dialog open class="screenshot-dialog" @close="emit('close')">
    <div class="screenshot-dialog-backdrop" />
    <div class="screenshot-dialog-container">
      <DialogPanel class="screenshot-dialog-panel">
        <form @submit.prevent="emit('save', options())">
          <div class="screenshot-dialog-header">
            <DialogTitle>{{ t("screenshotDialog.title") }}</DialogTitle>
            <button
              type="button"
              class="screenshot-dialog-close"
              :aria-label="t('screenshotDialog.cancel')"
              @click="emit('close')"
            >
              <X :size="16" />
            </button>
          </div>

          <div
            class="screenshot-dialog-modes"
            role="radiogroup"
            :aria-label="t('screenshotDialog.title')"
          >
            <button
              v-for="id in modes"
              :key="id"
              type="button"
              role="radio"
              :aria-checked="mode === id"
              :class="{ selected: mode === id }"
              @click="mode = id"
            >
              {{ t(`screenshotDialog.modes.${id}`) }}
            </button>
          </div>

          <p class="screenshot-dialog-hint">
            {{ t(`screenshotDialog.hints.${mode}`) }}
          </p>

          <div v-if="mode === 'custom'" class="screenshot-dialog-row">
            <span>{{ t("screenshotDialog.size") }}</span>
            <span class="screenshot-dialog-size">
              <input
                v-model.number="saved.width"
                type="number"
                min="1"
                :max="info.maxSize"
                required
                :aria-label="t('screenshotDialog.width')"
              />
              <span>×</span>
              <input
                v-model.number="saved.height"
                type="number"
                min="1"
                :max="info.maxSize"
                required
                :aria-label="t('screenshotDialog.height')"
              />
            </span>
          </div>
          <div v-else class="screenshot-dialog-row">
            <span>{{ t("screenshotDialog.output") }}</span>
            <span class="screenshot-dialog-value"
              >{{ info.full.width }} x {{ info.full.height }} px</span
            >
          </div>

          <label class="screenshot-dialog-switch">
            <span>{{ t("screenshotDialog.transparent") }}</span>
            <input v-model="saved.transparent" type="checkbox" role="switch" />
          </label>

          <div class="screenshot-dialog-actions">
            <button type="button" @click="emit('copy', options())">
              <Copy :size="14" />{{ t("screenshotDialog.copy") }}
            </button>
            <button type="submit" class="primary">
              {{ t("screenshotDialog.save") }}
            </button>
          </div>
        </form>
      </DialogPanel>
    </div>
  </Dialog>
</template>

<style scoped>
:global(.screenshot-dialog) {
  position: relative;
  z-index: 10001;
  color: var(--text-primary);
  font-size: 14px;
}

.screenshot-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 0.55);
}

.screenshot-dialog-container {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.screenshot-dialog-panel {
  width: 380px;
  max-width: 100%;
  padding: 20px;
  background: var(--surface-dialog, var(--surface-app));
  border: 1px solid var(--border-default);
  border-radius: 10px;
  box-shadow: 0 20px 50px rgb(0 0 0 / 0.5);
}

.screenshot-dialog-panel form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.screenshot-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.screenshot-dialog-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.screenshot-dialog-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.screenshot-dialog-close:hover {
  background: var(--surface-input);
  color: var(--text-primary);
}

.screenshot-dialog-modes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border-radius: 8px;
  background: var(--surface-input);
}

.screenshot-dialog-modes button {
  height: 34px;
  padding: 0 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.screenshot-dialog-modes button:hover {
  color: var(--text-primary);
}

.screenshot-dialog-modes button.selected {
  background: var(--accent);
  color: var(--text-on-accent);
  font-weight: 500;
}

.screenshot-dialog-hint {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12.5px;
  line-height: 1.5;
}

.screenshot-dialog-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 8px;
  background: var(--surface-input);
  color: var(--text-secondary);
  font-size: 13px;
}

.screenshot-dialog-value {
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.screenshot-dialog-size {
  display: flex;
  align-items: center;
  gap: 6px;
}

.screenshot-dialog-size input {
  width: 72px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--border-default);
  border-radius: 4px;
  background: var(--surface-app);
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.screenshot-dialog-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.screenshot-dialog-switch input {
  position: relative;
  flex-shrink: 0;
  width: 36px;
  height: 20px;
  margin: 0;
  border-radius: 10px;
  background: var(--border-default);
  appearance: none;
  cursor: pointer;
  transition: background 0.15s;
}

.screenshot-dialog-switch input::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s;
}

.screenshot-dialog-switch input:checked {
  background: var(--accent);
}

.screenshot-dialog-switch input:checked::after {
  transform: translateX(16px);
}

.screenshot-dialog-switch input:focus-visible,
.screenshot-dialog-modes button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.screenshot-dialog-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}

.screenshot-dialog-actions button {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 14px;
  line-height: 1.3;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--surface-input);
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.screenshot-dialog-actions button.primary {
  padding: 6px 16px;
  border-color: var(--accent);
  background: var(--accent);
  color: var(--text-on-accent);
  font-weight: 500;
}
</style>

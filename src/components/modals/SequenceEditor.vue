<script
  setup
  lang="ts"
>
import type { AnimationSequence } from "../../types/spine"

import { useI18n } from "vue-i18n"
import { GripVertical, Plus, Repeat, X } from "@lucide/vue"
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/vue"
import { computed, ref } from "vue"

const { t } = useI18n()
const props = defineProps<{ animations: string[], sequence: AnimationSequence | null }>()
const emit = defineEmits<{ close: [], save: [sequence: AnimationSequence] }>()

const name = ref(props.sequence?.name ?? t("preview.newSequence"))
const steps = ref<AnimationSequence["steps"]>(props.sequence
  ? props.sequence.steps.map(step => step.map(animation => ({ ...animation })))
  : [[{ animation: props.animations[0] ?? "", delay: 0, duration: null as number | null }]])
const selected = ref(0)
const dragged = ref<{ type: "step" | "animation", index: number } | null>(null)
const dropTarget = ref<number | null>(null)

const valid = computed(() => name.value.trim() && steps.value.length && steps.value.every(step =>
  step.length && step.every(entry => props.animations.includes(entry.animation)
    && Number.isFinite(entry.delay) && entry.delay >= 0
    && (entry.duration === null || Number.isFinite(entry.duration) && entry.duration > 0))))

function addStep() {
  steps.value.push([{ animation: props.animations[0] ?? "", delay: 0, duration: null }])
  selected.value = steps.value.length - 1
}

function removeStep(index: number) {
  const active = steps.value[selected.value]
  steps.value.splice(index, 1)
  selected.value = steps.value.includes(active) ? steps.value.indexOf(active) : Math.max(0, index - 1)
}

function startDrag(event: DragEvent, type: "step" | "animation", index: number) {
  dragged.value = { type, index }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", String(index))
  }
}

function dragOver(event: DragEvent, type: "step" | "animation", index: number) {
  if (dragged.value?.type !== type) return
  event.preventDefault()
  dropTarget.value = index
}

function drop(type: "step" | "animation", index: number) {
  if (dragged.value?.type !== type) return
  const active = steps.value[selected.value]
  if (type === "step") {
    steps.value.splice(index, 0, steps.value.splice(dragged.value.index, 1)[0])
    selected.value = steps.value.indexOf(active)
  } else {
    active.splice(index, 0, active.splice(dragged.value.index, 1)[0])
  }
  dragged.value = null
  dropTarget.value = null
}

function save() {
  if (valid.value) emit("save", { name: name.value.trim(), steps: steps.value })
}
</script>

<template>
  <Dialog :open="true" class="sequence-modal" @close="emit('close')">
    <div class="sequence-backdrop" aria-hidden="true" />
    <div class="sequence-container">
      <DialogPanel class="sequence-panel" @dragend="dragged = null; dropTarget = null">
        <header>
          <DialogTitle>{{ t('preview.editSequence') }}</DialogTitle>
          <button type="button" class="icon" :aria-label="t('preview.closeEditor')" @click="emit('close')">
            <X :size="16" />
          </button>
        </header>
        <form @submit.prevent="save">
          <label class="name">{{ t('preview.name') }}<input v-model="name" required /></label>
          <div class="tabs" role="tablist" :aria-label="t('preview.sequenceSteps')">
            <div v-for="(_, index) in steps" :key="index" class="tab" :class="{
              active: selected === index,
              dropping: dragged?.type === 'step' && dropTarget === index,
            }" draggable="true" @dragstart="startDrag($event, 'step', index)"
              @dragover="dragOver($event, 'step', index)" @drop.prevent.stop="drop('step', index)">
              <button :id="'sequence-tab-' + index" type="button" role="tab" :aria-selected="selected === index"
                aria-controls="sequence-step" @click="selected = index">{{ t('preview.step', { number: index + 1 })
                }}</button>
              <button type="button" class="icon" :aria-label="t('preview.closeStep', { number: index + 1 })"
                @click="removeStep(index)">
                <X :size="14" />
              </button>
            </div>
            <div class="tab add-tab"><button type="button" :aria-label="t('preview.addStep')" @click="addStep">
                <Plus :size="16" />
              </button></div>
          </div>
          <div v-if="steps[selected]" id="sequence-step" role="tabpanel" :aria-labelledby="'sequence-tab-' + selected">
            <div class="columns"><span /><span>{{ t('preview.animation') }}</span><span>{{ t('preview.startAfter')
                }}</span><span>{{ t('preview.playFor') }}</span><span /></div>
            <div v-for="(entry, index) in steps[selected]" :key="index" class="animation-row"
              :class="{ dropping: dragged?.type === 'animation' && dropTarget === index }"
              @dragover="dragOver($event, 'animation', index)" @drop.prevent.stop="drop('animation', index)">
              <button type="button" class="icon grip" draggable="true"
                :aria-label="t('preview.reorderAnimation', { number: index + 1 })"
                @dragstart.stop="startDrag($event, 'animation', index)">
                <GripVertical :size="14" />
              </button>
              <div class="animation-choice"><select v-model="entry.animation"
                  :aria-label="t('preview.animationNumber', { number: index + 1 })">
                  <option v-for="animation in animations" :key="animation">{{ animation }}</option>
                </select>
                <button type="button" class="icon" :aria-label="t('preview.loopNumber', { number: index + 1 })"
                  :title="t('preview.loopDuration')" :aria-pressed="!!entry.loop" @click="entry.loop = !entry.loop">
                  <Repeat :size="14" />
                </button>
              </div>
              <div class="time"><input v-model.number="entry.delay" type="number" min="0" step="any" required
                  :aria-label="t('preview.delayNumber', { number: index + 1 })" /><span>s</span></div>
              <div class="duration">
                <div class="time"><input v-model.number="entry.duration" type="number" min="0.001" step="any" required
                    :disabled="entry.duration === null" :placeholder="entry.duration === null ? t('preview.auto') : ''"
                    :aria-label="t('preview.durationNumber', { number: index + 1 })" /><span>s</span></div>
                <button type="button" :aria-pressed="entry.duration === null"
                  @click="entry.duration = entry.duration === null ? 1 : null">{{ t('preview.auto') }}</button>
              </div>
              <button type="button" class="icon" :aria-label="t('preview.removeAnimation', { number: index + 1 })"
                @click="steps[selected].splice(index, 1)">
                <X :size="14" />
              </button>
            </div>
            <button type="button" class="add-animation"
              @click="steps[selected].push({ animation: animations[0] ?? '', delay: 0, duration: null })">
              <Plus :size="14" />{{ t('preview.addAnimation') }}
            </button>
          </div>
          <p>{{ t('preview.sequenceHelp') }}</p>
          <footer><button type="submit" :disabled="!valid">{{ t('preview.saveSequence') }}</button></footer>
        </form>
      </DialogPanel>
    </div>
  </Dialog>
</template>

<style scoped>
.sequence-modal {
  position: relative;
  z-index: 150;
}

.sequence-backdrop {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / .55);
}

.sequence-container {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
}

.sequence-panel {
  width: 650px;
  max-width: 100%;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 16px;
  border: 1px solid var(--border-default);
  border-radius: 6px;
  background: var(--surface-app);
  color: var(--text-primary);
  font-size: 13px;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

header h2 {
  font-size: 14px;
  font-weight: 500;
}

button,
input,
select {
  min-width: 0;
  height: 30px;
  border: 1px solid var(--border-default);
  border-radius: 4px;
  background: var(--surface-input);
  color: inherit;
  font: inherit;
  padding: 0 8px;
}

button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
}

button:hover {
  background: var(--state-hover);
}

button:disabled {
  opacity: .45;
  cursor: default;
}

.icon {
  width: 24px;
  padding: 0;
  border: 0;
  background: transparent;
}

.name {
  display: grid;
  gap: 7px;
  margin-bottom: 18px;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  border-bottom: 1px solid var(--border-default);
  margin-bottom: 18px;
}

.tab {
  display: flex;
  align-items: center;
  padding: 0 3px;
  border: 1px solid var(--border-default);
  border-bottom: 2px solid transparent;
  border-radius: 4px 4px 0 0;
  background: var(--surface-input);
  cursor: grab;
}

.tab button {
  border: 0;
  background: transparent;
}

.tab.active {
  border-bottom-color: var(--accent);
  background: var(--state-hover);
}

.tab .icon {
  color: var(--text-secondary);
}

.add-tab {
  cursor: pointer;
}

.columns,
.animation-row {
  display: grid;
  grid-template-columns: 20px minmax(90px, 1fr) 90px 145px 24px;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.columns {
  color: var(--text-secondary);
  font-size: 12px;
}

.grip {
  width: 20px;
  cursor: grab;
  color: var(--text-secondary);
}

.time {
  position: relative;
  min-width: 0;
}

.time input {
  width: 100%;
  padding-right: 20px;
}

.time span {
  position: absolute;
  right: 7px;
  top: 6px;
  color: var(--text-secondary);
  pointer-events: none;
}

.animation-choice {
  display: flex;
  gap: 4px;
  min-width: 0;
}

.animation-choice select {
  flex: 1;
}

.animation-choice button[aria-pressed="true"] {
  color: var(--accent);
  background: var(--state-hover);
}

.duration {
  display: flex;
  gap: 4px;
}

.duration .time {
  flex: 1;
}

.duration button {
  padding: 0 6px;
  font-size: 12px;
}

.duration button[aria-pressed="true"] {
  background: var(--state-hover);
}

.add-animation {
  margin: 4px 0 18px 28px;
  background: transparent;
}

p {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.tab.dropping {
  box-shadow: inset 2px 0 var(--accent);
}

.animation-row.dropping {
  box-shadow: 0 -2px var(--accent);
}

@media (max-width: 520px) {
  .sequence-container {
    padding: 8px;
  }

  .sequence-panel {
    padding: 12px;
  }

  .columns,
  .animation-row {
    grid-template-columns: 16px minmax(60px, 1fr) 60px 100px 20px;
    gap: 4px;
  }

  input,
  select {
    padding-left: 4px;
  }

  .duration button {
    padding: 0 3px;
  }
}
</style>

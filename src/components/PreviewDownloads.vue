<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from "vue"
import { useI18n } from "vue-i18n"
import { onClickOutside, onKeyStroke } from "@vueuse/core"
import { Check, Download, TriangleAlert } from "@lucide/vue"
import { useDownloadStore, type Download as Item, type DownloadKind } from "../stores/downloads"

interface Row {
  key: string
  kind: DownloadKind
  name: string
  section: "active" | "failed" | "done"
  count: string
  progress: number
  description: string
}

const props = defineProps<{ previewId: string }>()

const { t } = useI18n()
const downloadStore = useDownloadStore()

const KINDS: DownloadKind[] = ["background", "voice"]
const CIRCUMFERENCE = 2 * Math.PI * 12

function itemProgress(item: Item) {
  if (item.state !== "loading") return 1
  if (!item.total) return 0
  return item.received / item.total
}

function fallbackDescription(kind: DownloadKind, items: Item[]) {
  const names = items
    .map((item, index) => ({ item, name: t(`downloads.${kind}Item`, { n: index + 1 }) }))
    .filter(({ item }) => item.state === "loading" && item.source && item.source !== "jsDelivr")
    .map(({ name }) => name)

  if (names.length === 1) return t("downloads.tryingGithub", { name: names[0] })
  if (names.length > 1) return t("downloads.tryingGithubCount", { count: names.length })
  return ""
}

const groups = computed(() =>
  KINDS.map(kind => {
    const items = downloadStore.items.filter(
      item => item.owner === props.previewId && item.kind === kind,
    )
    const failed = items.filter(item => item.state === "failed")
    const left = items.filter(item => item.state === "loading").length
    const totalProgress = items.reduce((sum, item) => sum + itemProgress(item), 0)

    return {
      kind,
      items,
      failed,
      left,
      done: items.length - left - failed.length,
      progress: items.length ? totalProgress / items.length : 0,
    }
  }).filter(group => group.items.some(item => item.source || item.state === "failed")),
)

const left = computed(() => groups.value.reduce((sum, group) => sum + group.left, 0))

const failedCount = computed(() => groups.value.reduce((sum, group) => sum + group.failed.length, 0))

const state = computed(() => {
  if (left.value > 0) return "active"
  if (failedCount.value > 0) return "failed"
  if (groups.value.length > 0) return "done"
  return "idle"
})

const progress = computed(() => {
  if (state.value !== "active") return 1

  const items = groups.value.flatMap(group => group.items)
  return items.reduce((sum, item) => sum + itemProgress(item), 0) / items.length
})

const finished = ref(false)
let finishedTimer: ReturnType<typeof setTimeout> | undefined

watch(state, (value, previous) => {
  clearTimeout(finishedTimer)
  finished.value = value === "done" && previous === "active"

  if (finished.value) {
    finishedTimer = setTimeout(() => {
      finished.value = false
    }, 2000)
  }
})

const visible = computed(() => state.value === "active" || state.value === "failed" || finished.value)

const open = ref(false)
const root = useTemplateRef("root")

onClickOutside(root, () => {
  open.value = false
})

onKeyStroke("Escape", () => {
  open.value = false
})

watch(visible, value => {
  if (!value) open.value = false
})

const badge = computed(() => {
  if (state.value === "active") return left.value
  if (state.value === "failed") return failedCount.value
  return 0
})

const label = computed(() => {
  if (state.value === "active") return t("downloads.downloading", { count: left.value })
  if (state.value === "failed") return t("downloads.failedCount", { count: failedCount.value })
  return t("downloads.finished")
})

const rows = computed(() => {
  const list: Row[] = []

  for (const group of groups.value) {
    if (group.items.length > group.failed.length) {
      list.push({
        key: group.kind,
        kind: group.kind,
        name: t(`downloads.${group.kind}`),
        section: group.left > 0 ? "active" : "done",
        count: `${group.done}/${group.items.length}`,
        progress: group.progress,
        description: fallbackDescription(group.kind, group.items),
      })
    }

    group.items.forEach((item, index) => {
      if (item.state !== "failed") return
      list.push({
        key: item.id,
        kind: group.kind,
        name: t(`downloads.${group.kind}Item`, { n: index + 1 }),
        section: "failed",
        count: "",
        progress: 0,
        description: t("downloads.failedBoth"),
      })
    })
  }

  return list
})

const sections = computed(() =>
  (["active", "failed", "done"] as const)
    .map(name => ({ name, rows: rows.value.filter(row => row.section === name) }))
    .filter(section => section.rows.length > 0),
)
</script>

<template>
  <div v-if="visible" ref="root" class="downloads">
    <button
      type="button"
      class="downloads-button"
      :class="`downloads-${state}`"
      :aria-expanded="open"
      :aria-label="label"
      :title="label"
      @click="open = !open"
    >
      <svg class="downloads-ring" viewBox="0 0 28 28" aria-hidden="true">
        <circle cx="14" cy="14" r="12" class="downloads-ring-track" />
        <circle
          cx="14"
          cy="14"
          r="12"
          class="downloads-ring-fill"
          :stroke-dasharray="CIRCUMFERENCE"
          :stroke-dashoffset="CIRCUMFERENCE * (1 - progress)"
        />
      </svg>
      <Check v-if="state === 'done'" :size="14" aria-hidden="true" />
      <Download v-else :size="14" aria-hidden="true" />
      <span v-if="badge" class="downloads-badge">{{ badge }}</span>
    </button>

    <div v-if="open" class="downloads-flyout" role="dialog" :aria-label="t('downloads.title')">
      <p class="downloads-title">{{ t("downloads.title") }}</p>

      <section v-for="section in sections" :key="section.name" class="downloads-section">
        <p class="downloads-heading">{{ t(`downloads.${section.name}`) }}</p>

        <div
          v-for="row in section.rows"
          :key="row.key"
          class="downloads-row"
          :class="{ 'downloads-row-done': row.section === 'done' }"
        >
          <TriangleAlert
            v-if="row.section === 'failed'"
            :size="14"
            class="downloads-error"
            aria-hidden="true"
          />
          <div class="downloads-body">
            <div class="downloads-line">
              <span class="downloads-name">{{ row.name }}</span>
              <button
                v-if="row.section === 'failed'"
                type="button"
                class="downloads-retry"
                @click="downloadStore.retry(previewId, row.kind)"
              >
                {{ t("common.retry") }}
              </button>
              <span v-else class="downloads-count">{{ row.count }}</span>
            </div>

            <span v-if="row.section === 'active'" class="downloads-bar">
              <span :style="{ width: `${row.progress * 100}%` }" />
            </span>

            <span v-if="row.description" class="downloads-meta">{{ row.description }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.downloads {
  position: absolute;
  inset: 8px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  pointer-events: none;
}

.downloads > * {
  pointer-events: auto;
}

.downloads-button {
  position: relative;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--text-primary);
  filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.6));
  cursor: pointer;
}

.downloads-ring {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}

.downloads-ring circle {
  fill: none;
  stroke-width: 2;
}

.downloads-ring-track {
  stroke: var(--border-default);
}

.downloads-ring-fill {
  stroke: var(--accent);
  transition: stroke-dashoffset 0.2s;
}

.downloads-failed .downloads-ring-fill {
  stroke: var(--error);
}

.downloads-done {
  color: var(--success);
}

.downloads-done .downloads-ring-fill {
  stroke: var(--success);
}

.downloads-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  background: var(--accent);
  color: var(--text-on-accent);
  font-size: 9px;
  font-weight: 700;
  line-height: 14px;
  font-variant-numeric: tabular-nums;
}

.downloads-failed .downloads-badge {
  background: var(--error);
}

.downloads-flyout {
  width: 280px;
  max-width: 100%;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  background: var(--surface-popover);
  color: var(--text-primary);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.28);
  font-size: 12px;
  line-height: 16px;
}

.downloads-title {
  margin: 0;
  padding: 10px 12px 4px;
  font-size: 13px;
  font-weight: 500;
}

.downloads-section {
  padding: 4px 0 6px;
}

.downloads-section + .downloads-section {
  border-top: 1px solid var(--border-default);
}

.downloads-heading {
  margin: 0;
  padding: 3px 12px 2px;
  color: var(--text-secondary);
  font-size: 11px;
}

.downloads-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 5px 12px;
}

.downloads-row > svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.downloads-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.downloads-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.downloads-name {
  overflow: hidden;
  color: var(--text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.downloads-row-done .downloads-name,
.downloads-row-done .downloads-count {
  color: var(--text-muted);
}

.downloads-count {
  flex-shrink: 0;
  color: var(--text-secondary);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 11px;
}

.downloads-bar {
  height: 4px;
  overflow: hidden;
  border-radius: 2px;
  background: var(--border-default);
}

.downloads-bar span {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 0.2s;
}

.downloads-meta {
  overflow-wrap: anywhere;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 15px;
}

.downloads-retry {
  flex-shrink: 0;
  height: 22px;
  padding: 0 9px;
  border: 1px solid var(--border-strong);
  border-radius: 4px;
  background: var(--surface-input);
  color: var(--text-primary);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.downloads-retry:hover {
  background: var(--state-hover);
}

.downloads-error {
  color: var(--error);
}
</style>

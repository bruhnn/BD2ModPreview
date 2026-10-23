<script setup lang="ts">
import { FolderOpen, ChevronRight } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { computed, useTemplateRef } from 'vue'

import { HistoryItem } from '../types/history'

import { arrow, autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue'
import { useElementHover } from '@vueuse/core'

const { t } = useI18n()
const props = defineProps<{
    folderHistory: HistoryItem
}>()
const emits = defineEmits([
    "clicked"
])

const recentFolderRef = useTemplateRef("recentFolderItem")
const tooltipRef = useTemplateRef("tooltip")
const tooltipArrow = useTemplateRef("tooltipArrow")

const folderPath = computed(() => props.folderHistory.source.type === "folder" ? props.folderHistory.source.path : "")

const { floatingStyles, middlewareData, placement } = useFloating(recentFolderRef, tooltipRef, {
    placement: 'top',
    whileElementsMounted: autoUpdate,
    middleware: [
        offset(8),
        flip(),
        shift(),
        arrow({ element: tooltipArrow })
    ]
})

const isHovered = useElementHover(recentFolderRef, { 'delayEnter': 800, 'delayLeave': 200 })

function getFolderName(path: string) {
    const parts = path.split(/[/\\]/)
    return parts.pop() || ''
}
</script>

<template>
    <button ref="recentFolderItem" @click="$emit('clicked', folderHistory)" class="recent-folder">

        <Transition name="tooltip-fade">
            <div v-show="isHovered" ref="tooltip" :style="floatingStyles" class="folder-tooltip">
                <div ref="tooltipArrow" class="tooltip-arrow" :class="`tooltip-arrow-${placement.split('-')[0]}`"
                    :style="{
                        position: 'absolute',
                        left:
                            middlewareData.arrow?.x != null
                                ? `${middlewareData.arrow.x}px`
                                : '',
                        top:
                            middlewareData.arrow?.y != null
                                ? `${middlewareData.arrow.y}px`
                                : '',
                    }"></div>

                <div class="tooltip-title">{{ t('preview.fullPath') }}:</div>
                <div class="tooltip-path">
                    {{ folderPath }}
                </div>

            </div>
        </Transition>

        <FolderOpen class="folder-icon" />

        <div class="folder-details">
            <div class="folder-name">
                {{ getFolderName(folderPath) }}
            </div>
            <div class="folder-path">
                {{ folderPath }}
            </div>
        </div>

        <ChevronRight class="folder-arrow" />
    </button>
</template>

<style scoped>
.recent-folder {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    padding: 12px 16px;
    border-radius: 8px;
    background: var(--surface-card);
    text-align: left;
    cursor: pointer;
    transition: background-color 200ms, color 200ms;
}

.recent-folder:hover {
    background: color-mix(in srgb, var(--state-hover) 80%, transparent);
}

.recent-folder:focus {
    background: var(--surface-card);
    outline: none;
}

.folder-tooltip {
    padding: 8px 12px;
    font-size: 14px;
    line-height: 20px;
    color: var(--text-primary);
    background: var(--surface-popover);
    border: 1px solid var(--border-strong);
    border-radius: 8px;
    box-shadow: 0 20px 25px -5px rgb(0 0 0 / .1), 0 8px 10px -6px rgb(0 0 0 / .1);
    backdrop-filter: blur(8px);
    z-index: 50;
    word-break: break-all;
}

.tooltip-title {
    font-weight: 500;
    margin-bottom: 4px;
}

.tooltip-path {
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.625;
}

.tooltip-arrow {
    width: 8px;
    height: 8px;
    background: var(--surface-popover);
    border-color: var(--border-strong);
    transform: rotate(45deg);
}

.tooltip-arrow-top {
    border-bottom-width: 1px;
    border-right-width: 1px;
    bottom: -4px;
}

.tooltip-arrow-bottom {
    border-top-width: 1px;
    border-left-width: 1px;
    top: -4px;
}

.tooltip-arrow-left {
    border-top-width: 1px;
    border-right-width: 1px;
    right: -4px;
}

.tooltip-arrow-right {
    border-bottom-width: 1px;
    border-left-width: 1px;
    left: -4px;
}

.folder-icon {
    width: 24px;
    height: 24px;
    color: var(--text-secondary);
    flex-shrink: 0;
    transition: color 150ms;
}

.folder-details {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: var(--text-secondary);
}

.folder-name,
.folder-path {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.folder-name {
    color: var(--text-primary);
    font-weight: 500;
    transition: color 150ms;
}

.folder-path {
    color: var(--text-muted);
    font-size: 14px;
    line-height: 20px;
}

.folder-arrow {
    width: 16px;
    height: 16px;
    color: var(--text-muted);
    transition: transform 150ms, color 150ms;
}

.recent-folder:hover .folder-arrow {
    transform: translateX(4px);
}

.tooltip-fade-enter-active {
    transition: opacity 200ms ease-out;
}

.tooltip-fade-leave-active {
    transition: opacity 150ms ease-in;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
    opacity: 0;
}
</style>
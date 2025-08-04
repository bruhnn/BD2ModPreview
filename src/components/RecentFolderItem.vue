<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { HistoryItem } from '../types/history';
import { arrow, autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue';
import { useElementHover } from '@vueuse/core';

const props = defineProps<{
    folderHistory: HistoryItem
}>()

const emits = defineEmits([
    "clicked"
])

const recentFolderRef = useTemplateRef("recentFolderItem")
const tooltipRef = useTemplateRef("tooltip")
const tooltipArrow = useTemplateRef("tooltipArrow")

const showTooltip = ref(false);

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

function getFolderName(path: string) {
    const parts = path.split(/[/\\]/);
    return parts.pop() || '';
}

const arrowClasses = computed(() => {
  const side = placement.value.split('-')[0]
  
  const baseClasses = 'w-2 h-2 bg-gray-800 border-gray-600'
  
  switch (side) {
    case 'top':
      return `${baseClasses} border-b border-r transform rotate-45 -bottom-1`
    case 'bottom':
      return `${baseClasses} border-t border-l transform rotate-45 -top-1`
    case 'left':
      return `${baseClasses} border-t border-r transform rotate-45 -right-1`
    case 'right':
      return `${baseClasses} border-b border-l transform rotate-45 -left-1`
    default:
      return `${baseClasses} border-b border-r transform rotate-45 -bottom-1`
  }
})

const isHovered = useElementHover(recentFolderRef, { 'delayEnter': 800, 'delayLeave': 200 })
</script>

<template>
    <button ref="recentFolderItem"
        @click="$emit('clicked', folderHistory)"
        class="cursor-pointer flex items-center gap-4 bg-slate-800 px-4 py-3 rounded-lg hover:bg-slate-700/80 focus:bg-slate-700 focus:outline-none transition-colors duration-200 w-full text-left group">

        <Transition name="tooltip-fade" enter-active-class="transition-opacity duration-200 ease-out"
            enter-from-class="opacity-0" enter-to-class="opacity-100"
            leave-active-class="transition-opacity duration-150 ease-in" leave-from-class="opacity-100"
            leave-to-class="opacity-0">
            <div v-show="isHovered" ref="tooltip" :style="floatingStyles" class="px-3 py-2 text-sm text-white bg-gray-800 border border-gray-600 rounded-lg shadow-xl backdrop-blur-sm z-50 break-all">
                <div ref="tooltipArrow" :class="arrowClasses" :style="{
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

                <div class="font-medium text-gray-200 mb-1">Full Path:</div>
                <div class="text-gray-300 font-mono text-xs leading-relaxed">
                    {{ folderHistory.source.path }}
                </div>
                
            </div>
        </Transition>

        <svg class="w-6 h-6 text-gray-400 flex-shrink-0 transition-colors" xmlns="http://www.w3.org/2000/svg"
            viewBox="0 -960 960 960" fill="currentColor">
            <path
                d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640H447l-80-80H160v480l96-320h684L837-217q-8 26-29.5 41.5T760-160H160Zm84-80h516l72-240H316l-72 240Zm0 0 72-240-72 240Zm-84-400v-80 80Z" />
        </svg>

        <div class="flex-1 min-w-0 overflow-hidden text-gray-300">
            <div class="text-slate-200 font-medium group-hover:text-white truncate transition-colors">
                {{ getFolderName(folderHistory.source.path) }}
            </div>
            <div class="text-slate-500 text-sm truncate">
                {{ folderHistory.source.path }}
            </div>
        </div>

        <svg class="w-4 h-4 text-gray-500 group-hover:translate-x-[4px] transition-all"
            xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
            <path d="m321-80-71-71 329-329-329-329 71-71 400 400L321-80Z" />
        </svg>
    </button>
</template>

<style scoped></style>
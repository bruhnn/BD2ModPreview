<script setup lang="ts">
import { Transition } from 'vue';
import BaseControls from './BaseControls.vue'
import { useUIStore } from '../../stores/ui';

const uiStore = useUIStore();
</script>

<template>
    <Transition 
        enter-active-class="duration-300 ease-out" 
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100" 
        leave-active-class="duration-200 ease-in"
        leave-from-class="opacity-100 scale-100" 
        leave-to-class="opacity-0 scale-95"
    >
        <div 
            v-draggable-resizable 
            v-show="uiStore.showControls" 
            ref="controlsRef"
            class="fixed overflow-hidden z-800 left-8 bg-gradient-to-br pointer-events-auto max-h-[100vh] from-slate-900 to-slate-800 backdrop-blur-xl border border-slate-700/50 text-slate-200 rounded-2xl w-96 flex flex-col shadow-2xl scrollbar scrollbar-thumb-slate-600 scrollbar-track-slate-800"
        >
            <BaseControls />
        </div>
    </Transition>
</template>

<style scoped></style>
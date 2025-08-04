<script setup lang="ts">
import BaseControls from './BaseControls.vue'
</script>

<template>
    <div ref="controlsRef" class="w-96 h-full bg-gradient-to-br pointer-events-auto from-slate-900 to-slate-800 backdrop-blur-xl border-r border-slate-700/50 text-slate-200 flex flex-col shadow-2xl scrollbar scrollbar-thumb-slate-600 scrollbar-track-slate-800 ">
        <BaseControls />
    </div>
</template>

<style scoped></style>
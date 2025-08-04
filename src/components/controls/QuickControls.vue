<script setup lang="ts">
import { useSpineStore } from '../../stores/spine';


const spineStore = useSpineStore();
</script>
<template>
    <div
        class="absolute top-8 left-[50%] translate-x-[-50%] z-50 bg-black/15 w-full max-w-lg mx-auto p-4 backdrop-blur-xl rounded-lg text-slate-400 flex justify-center items-center">
        <div class="max-h-64 overflow-y-auto scrollbar scrollbar-thumb-slate-600 scrollbar-track-slate-800">
            <select v-model="spineStore.currentAnimation"
                class="w-full rounded-lg  border border-slate-700/50 bg-slate-800/25 p-1 text-sm font-medium text-slate-200 transition-all duration-200 hover:border-slate-600 hover:bg-slate-700/20 focus:border-slate-500 focus:bg-slate-700/30 focus:outline-none focus:ring-1 focus:ring-slate-600">
                <option v-for="anim in spineStore.allAnimations" :key="anim" :value="anim"
                    class="bg-slate-800 text-slate-200">
                    {{ anim }}
                </option>
            </select>
        </div>
    </div>
</template>
<style scoped></style>
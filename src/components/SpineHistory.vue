<script setup lang="ts">
import { Dialog, DialogDescription, DialogPanel, DialogTitle, TransitionRoot } from '@headlessui/vue';
import { computed, ref } from 'vue';


const props = defineProps({
    show: Boolean,
    history: Array
})

defineEmits([
    "spineSelected",
    "close"
])

const historyReversed = computed(() => {
     return props.history ? [...props.history].reverse() : []
})

// const history = ref([
//     {
//         path: "C:\\Users\\dogui\\Downloads\\bd2mm\\mods\\Scene_Onsen",
//         timestamp: new Date().toLocaleTimeString()
//     }
// ])

// TODO: show character name, character img in history if applicable

</script>
<template>
    <TransitionRoot :show="show" as="template" enter="duration-300 ease-out" enter-from="opacity-0"
        enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <Dialog as="div" class="relative z-50 " @close="$emit('close')">
            <div class="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div class="fixed inset-0 flex w-screen items-center justify-center">
                <DialogPanel class="flex flex-col w-xl rounded bg-gray-800 p-4 max-h-[90vh]">
                    <div class="flex flex-row justify-between text-2xl text-gray-400">
                        <DialogTitle class="font-semibold">
                            History
                        </DialogTitle>
                        <button
                            class="border-0 inset-0 transition-colors duration-200 hover:text-gray-300 cursor-pointer outline-none"
                            @click="$emit('close')">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                                fill="currentColor">
                                <path
                                    d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                            </svg>
                        </button>
                    </div>
                    <DialogDescription class="flex flex-col overflow-y-auto px-1 pr-2 text-gray-100 scrollbar overflow-y-auto">
                        <div v-if="historyReversed.length === 0" class="text-center text-gray-500 py-8 ">
                            No recent history
                        </div>
                        <div v-else v-for="item in historyReversed" :key="item.timestamp"
                            class="flex items-center justify-between border-b gap-32 border-gray-700 py-2">
                            <div class="flex flex-col text-sm">
                                <span class="font-medium break-all">{{ item.path }}</span>
                                <span class="text-xs text-gray-400">20 minutes ago</span>
                            </div>
                            <button
                            @click="$emit('spineSelected', item.path)"
                                class="cursor-pointer text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-500 transition">
                                Load
                            </button>
                        </div>
                    </DialogDescription>
                </DialogPanel>
            </div>
        </Dialog>
    </TransitionRoot>
</template>
<style></style>
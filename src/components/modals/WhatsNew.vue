<script setup lang="ts">
import {
    Dialog,
    DialogPanel,
    DialogTitle,
    DialogDescription,
    TransitionRoot,
    TransitionChild
} from '@headlessui/vue'

defineProps({
    show: Boolean
})

defineEmits(['close'])

// TODO: move from hardcoded
</script>

<template>
    <TransitionRoot :show="show" as="template">
        <Dialog as="div" class="relative z-50" @close="$emit('close')">
            <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100"
                leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
                <div class="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" />
            </TransitionChild>

            <div class="fixed inset-0 flex items-center justify-center p-4">
                <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 scale-95"
                    enter-to="opacity-100 scale-100" leave="ease-in duration-200" leave-from="opacity-100 scale-100"
                    leave-to="opacity-0 scale-95">
                    <DialogPanel
                        class="relative w-full max-w-4xl max-h-[90vh] bg-slate-800 rounded-xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden">
                        <div class="relative px-6 py-4 border-b border-slate-700/50">
                            <DialogTitle class="text-xl font-medium text-slate-100 text-center">
                                What's New
                            </DialogTitle>

                            <button @click="$emit('close')"
                                class="absolute cursor-pointer right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors duration-200">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div class="text-slate-400 px-6 py-4 flex flex-col gap-2">
                            <span>
                                Have feedback or ideas? I'd love to hear from you! Open an issue
                                on GitHub and I'll do my best to include your suggestions in
                                future updates.
                            </span>
                            <span>
                                有反馈或想法吗？欢迎在 GitHub 上分享！我很乐意听取你的建议并在未来的更新中实现。
                            </span>
                        </div>

                        <DialogDescription class="flex-1 overflow-y-auto px-6 pb-6 text-slate-300 gap-6">
                            <p class="mb-4 text-slate-300 font-semibold">

                            </p>
                            <div class="space-y-8">
                                <div>
                                    <h3 class="text-lg font-semibold text-slate-100 flex items-center gap-2">
                                        <span>
                                            Version 0.4.1
                                        </span>
                                        <span
                                            class="inline-block px-2 py-0.5 text-xs font-medium rounded border border-slate-600 bg-slate-700 text-slate-300 select-none">Current</span>
                                    </h3>
                                    <ul class="list-disc list-inside space-y-1 mt-2">
                                        <li class="text-slate-200">
                                            Removed "Olivier - White Witch" from the cutscene tab in the character list
                                        </li>
                                        <li class="text-slate-200">
                                            Prevented infinite retry on spine source fallback failure
                                        </li>
                                        <li class="text-slate-200">
                                            Show unreleased characters first when sorting by newest
                                        </li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 class="text-lg font-semibold text-slate-100">Version 0.4.0</h3>
                                    <ul class="list-disc list-inside space-y-1">
                                        <li class="text-slate-200">Added Home Page with recent folders</li>
                                        <li class="text-slate-200">Added sidebar controls (you can change between
                                            floating and sidebar)</li>
                                        <li class="text-slate-200">Character List improvements: sorting options,
                                            improved CDN asset loading</li>
                                        <li class="text-slate-200">Added language support: cn Chinese, ja Japanese</li>
                                        <li class="text-slate-200">Improved history modal</li>
                                        <li class="text-slate-200">Added "What's New" modal</li>
                                    </ul>
                                </div>
                            </div>
                        </DialogDescription>

                        <div class="bg-slate-800/50 px-6 py-4 border-t border-slate-600/30 backdrop-blur-sm">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-2">
                                    <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor"
                                        viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p class="text-sm text-slate-400">
                                        Got a suggestion or bug?
                                        <a href="https://github.com/bruhnn/BD2ModPreview/issues" target="_blank"
                                            class="text-blue-400 hover:text-blue-300 underline decoration-blue-400/50 hover:decoration-blue-300 underline-offset-2 transition-colors ml-1">
                                            Open an issue on GitHub
                                        </a>
                                    </p>
                                </div>

                                <button @click="$emit('close')"
                                    class="px-4 cursor-pointer py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white rounded-lg transition-colors duration-200 text-sm font-medium">
                                    Got it!
                                </button>
                            </div>
                        </div>
                    </DialogPanel>
                </TransitionChild>
            </div>
        </Dialog>
    </TransitionRoot>
</template>


<style scoped>
::-webkit-scrollbar {
    width: 6px;
}

::-webkit-scrollbar-track {
    background: rgb(51 65 85 / 0.3);
    border-radius: 3px;
}

::-webkit-scrollbar-thumb {
    background: rgb(100 116 139 / 0.5);
    border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
    background: rgb(100 116 139 / 0.7);
}
</style>
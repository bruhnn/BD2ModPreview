<script setup lang="ts">
import { Dialog, DialogDescription, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { useI18n } from 'vue-i18n';
import { useHistory } from '../../composables/useHistory';
import { useSpineStore } from '../../stores/spine';
import { useCharactersStore } from '../../stores/characters';
import { HistoryItem } from '../../types/history';
import { formatTimeAgo } from '@vueuse/core';

defineProps({
    show: Boolean,
})

defineEmits([
    "close"
])

const { t } = useI18n();
const { history, removeFromHistory } = useHistory();
const spineStore = useSpineStore();
const charactersStore = useCharactersStore();

function handleSelect(item: HistoryItem) {
    if (item.source.type === "url") {
        spineStore.setSpineUrl(item.source.skeletonUrl, item.source.atlasUrl)
    } else {
        spineStore.setSpineFolder(item.source.path)
    }
}

function getCharacterInfo(item: HistoryItem) {
    if (item.characterId) {
        const character = charactersStore.getCharacterById(item.characterId);
        return `${character?.character} - ${character?.costume}`
    }

    return t('historyDialog.unknownCharacter');
}

const modTypeMap = {
    idle: "historyDialog.modTypes.standing",
    cutscene: "historyDialog.modTypes.cutscene",
    npc: "historyDialog.modTypes.npc",
    illustspecial: "historyDialog.modTypes.scene",
    dating: "historyDialog.modTypes.dating"
}

function getModTypeLabel(modType: string) {
    const translationKey = modTypeMap[modType];
    return translationKey ? t(translationKey) : modType;
}
</script>

<template>
    <TransitionRoot :show="show" as="template" enter="duration-300 ease-out" enter-from="opacity-0"
        enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <Dialog as="div" class="relative z-9999" @close="$emit('close')">
            <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100"
                leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
                <div class="fixed inset-0 bg-black/30" />
            </TransitionChild>

            <div class="fixed inset-0 flex w-screen items-center justify-center">
                <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 scale-95"
                    enter-to="opacity-100 scale-100" leave="ease-in duration-200" leave-from="opacity-100 scale-100"
                    leave-to="opacity-0 scale-95">
                    <DialogPanel class="flex flex-col w-full max-w-4xl mx-4 rounded bg-gray-800 p-4 max-h-[90vh]">
                        <div class="flex flex-row justify-between text-2xl text-gray-400 py-2">
                            <DialogTitle class="font-semibold">
                                {{ t('historyDialog.title', { count: history.length }) }}
                            </DialogTitle>
                            <button
                                class="border-0 inset-0 transition-colors duration-200 hover:text-gray-300 cursor-pointer outline-none"
                                @click="$emit('close')"
                                :aria-label="t('common.close')">
                                <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960"
                                    width="32px" fill="currentColor">
                                    <path
                                        d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                                </svg>
                            </button>
                        </div>
                        <DialogDescription
                            class="flex flex-col overflow-y-auto px-1 pr-2 text-gray-100 scrollbar overflow-y-auto">
                            <div v-if="history.length === 0" class="text-center text-gray-500 py-8 ">
                                {{ t('historyDialog.noHistory') }}
                            </div>
                            <div v-else v-for="item in history" :key="item.timestamp"
                                class="flex items-center justify-between border-b gap-4 border-gray-700 py-3">
                                <div class="flex items-center gap-3 flex-1 min-w-0">
                                    <!-- icon -->
                                    <div v-if="item.source.type === 'url'"
                                        class="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0"
                                        :title="t('historyDialog.sourceTypes.github')">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-gray-400"
                                            fill="currentColor" viewBox="0 0 24 24">
                                            <path
                                                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                                        </svg>
                                    </div>
                                    <div v-else
                                        class="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0"
                                        :title="t('historyDialog.sourceTypes.folder')">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-gray-400"
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                                        </svg>
                                    </div>

                                    <div class="flex flex-col min-w-0 flex-1">
                                        <span class="font-medium text-gray-100">{{ getCharacterInfo(item) }}</span>

                                        <div class="flex items-center gap-2 text-xs text-gray-400">
                                            <span v-if="item.source.type == 'folder'">{{ item.source.path }}</span>
                                        </div>

                                        <div class="flex items-center gap-2 text-xs text-gray-400">
                                            <span v-if="item.source.type == 'url'">{{ t('historyDialog.sourceTypes.github') }}</span>
                                            <span v-else>{{ t('historyDialog.sourceTypes.folder') }}</span>
                                            <span>•</span>
                                            <span>{{ item.modType ? getModTypeLabel(item.modType) : t('historyDialog.unknownModType') }}</span>
                                            <span>•</span>
                                            <span>{{ formatTimeAgo(new Date(item.timestamp)) }}</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="flex items-center gap-2 flex-shrink-0">
                                    <button @click="removeFromHistory(item.id)"
                                        class="cursor-pointer text-sm text-gray-400 hover:text-red-400 transition p-1"
                                        :title="t('historyDialog.actions.remove')"
                                        :aria-label="t('historyDialog.actions.remove')">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none"
                                            viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                    <button @click="handleSelect(item)"
                                        class="cursor-pointer text-sm bg-slate-600 text-slate-200 px-3 py-1 rounded hover:bg-slate-500 transition">
                                        {{ t('historyDialog.actions.loadAnimation') }}
                                    </button>
                                </div>
                            </div>
                        </DialogDescription>
                    </DialogPanel>
                </TransitionChild>
            </div>
        </Dialog>
    </TransitionRoot>
</template>

<style scoped>
* {
    user-select: auto;
}
</style>
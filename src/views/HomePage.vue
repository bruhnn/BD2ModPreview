<script setup lang="ts">
import { computed, ref } from 'vue';
import { useHistory } from '../composables/useHistory';
import { open } from '@tauri-apps/plugin-dialog';
import { useSpineStore } from '../stores/spine';
import { useLogger } from '../composables/useLogger';
import RecentFolderItem from '../components/RecentFolderItem.vue';
import { useLocalStorage } from '@vueuse/core';

const spineStore = useSpineStore();
const { history } = useHistory();
const { logMessage } = useLogger();

const isRecentFoldersExpanded = useLocalStorage('IS_RECENT_FOLDERS_EXPANDED', false);

const recentFolders = computed(() => {
    return history.value.filter((historyItem) => historyItem.source.type === "folder").slice(0, 5);
});

const hasRecentFolders = computed(() => recentFolders.value.length > 0);

async function openFolderDialog(): Promise<void> {
    try {
        const selectedPath = await open({
            directory: true,
            multiple: false
        });

        if (typeof selectedPath === 'string' && selectedPath) {
            spineStore.setSpineFolder(selectedPath);
        }
    } catch (error) {
        logMessage(`Error opening folder dialog: ${error}`, 'error');
    }
}

function toggleRecentFolders(): void {
    isRecentFoldersExpanded.value = !isRecentFoldersExpanded.value;
}

function onRecentFolderClicked(folder: any): void {
    try {
        spineStore.setSpineFolder(folder.source.path);
    } catch (error) {
        logMessage(`Error selecting recent folder: ${error}`, 'error');
    }
}


</script>

<template>
    <div class="p-4 md:p-8 align-center justify-center max-w-full h-full flex flex-col">

        <div class="flex-1 text-gray-400 flex flex-col items-center gap-6 mb-8 justify-center">
            <div class="flex justify-center shrink-0">
                <svg class="w-16 h-16 md:w-20 md:h-20" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"
                    fill="currentColor">
                    <path
                        d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z" />
                </svg>
            </div>

            <div class="gap-2 flex flex-col items-center text-center">
                <div class="font-bold text-xl md:text-2xl text-emerald-500">
                    Mod Preview
                </div>
                
                <div class="text-sm md:text-base font-medium text-gray-400">
                    Drag & Drop or Choose a Folder
                </div>
            </div>

            <div>
                <button type="button"
                    class="cursor-pointer inline-flex justify-center rounded-md border border-transparent bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:border-gray-700"
                    @click="openFolderDialog">
                    Browse Folder
                </button>
            </div>
        </div>
        <div class="w-full max-w-full text-center">
            <div v-if="hasRecentFolders" class="max-w-2xl mx-auto flex-shrink-0"
                :class="{ 'mb-4': !isRecentFoldersExpanded }">
                <button @click="toggleRecentFolders"
                    class="w-full cursor-pointer flex items-center justify-between p-3 text-left bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-colors duration-200 focus:outline-none mb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-md font-semibold text-white">Recent Folders</span>
                        <span class="text-xs text-gray-500 hidden sm:inline">({{ recentFolders.length }})</span>
                    </div>
                    <svg class="w-5 h-5 text-gray-400 transition-transform duration-200"
                        :class="{ 'rotate-180': isRecentFoldersExpanded }" xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 -960 960 960" fill="currentColor">
                        <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z" />
                    </svg>
                </button>

                <div class="overflow-hidden transition-all duration-300 ease-in-out h-full" :class="{
                    'max-h-0 opacity-0': !isRecentFoldersExpanded,
                    'max-h-[40vh] opacity-100': isRecentFoldersExpanded
                }">
                    <div class="overflow-y-auto max-h-[40vh] pr-2 scrollbar">
                        <div class="flex flex-col gap-2">
                            <RecentFolderItem v-for="folder in recentFolders" :key="folder.timestamp" :folderHistory="folder" @clicked="onRecentFolderClicked"></RecentFolderItem>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
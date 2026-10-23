<script
    setup
    lang="ts"
>
import { Folder, Globe, Trash2, X } from "@lucide/vue"
import { Dialog, DialogDescription, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { useI18n } from 'vue-i18n'

import { useHistory } from '../../composables/useHistory'
import { usePreviewerStore } from '../../stores/previewer'
import { useCharactersStore } from '../../stores/characters'
import { HistoryItem } from '../../types/history'

import { formatTimeAgo } from '@vueuse/core'

defineProps({
    show: Boolean,
})

const emit = defineEmits([
    "close"
])
const { t } = useI18n()
const { history, removeFromHistory } = useHistory()
const charactersStore = useCharactersStore()
const previewerStore = usePreviewerStore()
const modTypeMap: Record<string, string> = {
    idle: "historyDialog.modTypes.standing",
    cutscene: "historyDialog.modTypes.cutscene",
    npc: "historyDialog.modTypes.npc",
    illustspecial: "historyDialog.modTypes.scene",
    dating: "historyDialog.modTypes.dating"
}

function handleSelect(item: HistoryItem) {
    const title = item.title || (item.source.type === "folder"
        ? item.source.path.split(/[\\/]/).filter(Boolean).pop() || item.source.path
        : getCharacterInfo(item))
    previewerStore.openPreview(title, { ...item.source })
    emit("close")
}

function getCharacterInfo(item: HistoryItem) {
    if (item.title) return item.title
    if (item.characterId) {
        const character = charactersStore.getCharacterById(item.characterId)
        if (character) return `${charactersStore.getLocalizedName(character.character_name)} - ${charactersStore.getLocalizedName(character.costume_name)}`
    }

    return t('historyDialog.unknownCharacter')
}

function getModTypeLabel(modType: string) {
    const translationKey = modTypeMap[modType]
    return translationKey ? t(translationKey) : modType
}
</script>

<template>
    <TransitionRoot :show="show" as="template" enter="dialog-enter" enter-from="dialog-hidden" enter-to="dialog-visible"
        leave="dialog-leave" leave-from="dialog-visible" leave-to="dialog-hidden">
        <Dialog as="div" class="history-modal" @close="$emit('close')">
            <TransitionChild as="template" enter="dialog-enter" enter-from="dialog-hidden" enter-to="dialog-visible"
                leave="dialog-leave" leave-from="dialog-visible" leave-to="dialog-hidden">
                <div class="history-backdrop" />
            </TransitionChild>

            <div class="history-container">
                <TransitionChild as="template" enter="dialog-enter" enter-from="panel-hidden" enter-to="panel-visible"
                    leave="dialog-leave" leave-from="panel-visible" leave-to="panel-hidden">
                    <DialogPanel class="history-panel">
                        <div class="history-header">
                            <DialogTitle class="history-title">
                                {{ t('historyDialog.title', { count: history.length }) }}
                            </DialogTitle>
                            <button type="button" class="preview-close-button" @click="$emit('close')"
                                :aria-label="t('common.close')">
                                <X :size="16" aria-hidden="true" />
                            </button>
                        </div>
                        <DialogDescription class="history-content scrollbar">
                            <div v-if="history.length === 0" class="history-empty">
                                {{ t('historyDialog.noHistory') }}
                            </div>
                            <div v-else v-for="item in history" :key="item.timestamp" class="history-item">
                                <div class="history-source">
                                    <!-- icon -->
                                    <div v-if="item.source.type === 'url'" class="history-avatar"
                                        :title="t('historyDialog.sourceTypes.github')">
                                        <Globe :size="20" class="source-icon" aria-hidden="true" />
                                    </div>
                                    <div v-else class="history-avatar" :title="t('historyDialog.sourceTypes.folder')">
                                        <Folder :size="20" class="source-icon" aria-hidden="true" />
                                    </div>

                                    <div class="history-details">
                                        <span class="history-name">{{ getCharacterInfo(item) }}</span>

                                        <div class="history-metadata">
                                            <span v-if="item.source.type == 'folder'">{{ item.source.path }}</span>
                                        </div>

                                        <div class="history-metadata">
                                            <span v-if="item.source.type == 'url'">{{
                                                t('historyDialog.sourceTypes.github') }}</span>
                                            <span v-else>{{ t('historyDialog.sourceTypes.folder') }}</span>
                                            <span>•</span>
                                            <span>{{ item.modType ? getModTypeLabel(item.modType) :
                                                t('historyDialog.unknownModType') }}</span>
                                            <span>•</span>
                                            <span>{{ formatTimeAgo(new Date(item.timestamp)) }}</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="history-actions">
                                    <button @click="removeFromHistory(item.id)" class="remove-button"
                                        :title="t('historyDialog.actions.remove')"
                                        :aria-label="t('historyDialog.actions.remove')">
                                        <Trash2 :size="16" aria-hidden="true" />
                                    </button>
                                    <button @click="handleSelect(item)" class="load-button">
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
.history-modal {
    position: relative;
    z-index: 10000;
    color: var(--text-primary);
    font-size: 14px;
}

.history-backdrop {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / .55);
}

.history-container {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    overflow-y: auto;
}

.history-panel {
    display: flex;
    flex-direction: column;
    width: 896px;
    max-width: 100%;
    max-height: calc(100vh - 40px);
    background: var(--surface-app);
    border: 1px solid var(--border-default);
    border-radius: 8px;
}

.history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    padding: 16px 20px;
}

.history-title {
    font-size: 16px;
    font-weight: 500;
    margin: 0;
}

.history-content {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
    padding: 4px 24px 24px;
    color: var(--text-primary);
}

.history-empty {
    text-align: center;
    color: var(--text-muted);
    padding: 32px 0;
}

.history-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border-default);
    gap: 16px;
    padding: 12px 0;
}

.history-source {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
}

.history-avatar {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.source-icon {
    color: var(--text-secondary);
}

.history-details {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
}

.history-name {
    font-weight: 500;
}

.history-metadata {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-secondary);
    overflow-wrap: anywhere;
}

.history-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.remove-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 0;
    border-radius: 3px;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
}

.remove-button:hover {
    background: var(--state-hover);
    color: var(--error);
}

.load-button {
    display: inline-flex;
    align-items: center;
    height: 32px;
    padding: 0 10px;
    border: 1px solid var(--border-default);
    border-radius: 4px;
    background: var(--surface-input);
    color: var(--text-primary);
    font: inherit;
    cursor: pointer;
}

.load-button:hover {
    background: var(--state-hover);
}

.dialog-enter {
    transition: opacity 300ms ease-out, transform 300ms ease-out;
}

.dialog-leave {
    transition: opacity 200ms ease-in, transform 200ms ease-in;
}

.dialog-hidden {
    opacity: 0;
}

.dialog-visible {
    opacity: 1;
}

.panel-hidden {
    opacity: 0;
    transform: scale(.95);
}

.panel-visible {
    opacity: 1;
    transform: scale(1);
}

* {
    user-select: auto;
}
</style>
<script
    setup
    lang="ts"
>
import { version } from "../../../package.json"

import { useI18n } from "vue-i18n"
import { X, Info } from "@lucide/vue"
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

const { t } = useI18n()
</script>

<template>
    <TransitionRoot :show="show" as="template">
        <Dialog as="div" class="updates-modal" @close="$emit('close')">
            <TransitionChild as="template" enter="dialog-enter" enter-from="dialog-hidden" enter-to="dialog-visible"
                leave="dialog-leave" leave-from="dialog-visible" leave-to="dialog-hidden">
                <div class="updates-backdrop" />
            </TransitionChild>

            <div class="updates-container">
                <TransitionChild as="template" enter="dialog-enter" enter-from="panel-hidden" enter-to="panel-visible"
                    leave="dialog-leave" leave-from="panel-visible" leave-to="panel-hidden">
                    <DialogPanel class="updates-panel">
                        <div class="updates-header">
                            <DialogTitle class="updates-title">
                                {{ t('whatsNew.title') }}
                            </DialogTitle>

                            <button type="button" :aria-label="t('common.close')" @click="$emit('close')"
                                class="preview-close-button updates-close">
                                <X :size="16" aria-hidden="true" />
                            </button>
                        </div>
                        <div class="updates-intro">
                            <span>{{ t('whatsNew.feedback') }}</span>
                        </div>

                        <DialogDescription class="updates-content">
                            <p class="updates-summary"></p>
                            <div class="updates-sections">
                                <div>
                                    <h3 class="section-title">
                                        <span>{{ t('whatsNew.version', { version }) }}</span>
                                        <span class="version-badge">
                                            {{ t('whatsNew.current') }}
                                        </span>
                                    </h3>
                                    <ul class="updates-list">
                                        <li v-for="item in ['grid', 'controls', 'sequences', 'modManager', 'dating', 'datingCache', 'cutscenes', 'folders', 'themes']"
                                            :key="item" class="update-item">
                                            {{ t('whatsNew.' + item) }}
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </DialogDescription>

                        <div class="updates-footer">
                            <div class="footer-content">
                                <div class="footer-link">
                                    <Info class="github-icon" />
                                    <p class="github-text">
                                        <a href="https://github.com/bruhnn/BD2ModPreview/issues" target="_blank"
                                            class="github-link">
                                            {{ t('whatsNew.issue') }}
                                        </a>
                                    </p>
                                </div>

                                <button @click="$emit('close')" class="close-button">
                                    {{ t('whatsNew.done') }}
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
.updates-modal {
    position: relative;
    z-index: 50;
}

.updates-backdrop {
    position: fixed;
    inset: 0;
    background: color-mix(in srgb, var(--surface-app) 80%, transparent);
    backdrop-filter: blur(8px);
}

.updates-container {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
}

.updates-panel {
    position: relative;
    width: 100%;
    max-width: 896px;
    max-height: 90vh;
    background: var(--surface-dialog);
    border-radius: 12px;
    box-shadow: 0 25px 50px -12px rgb(0 0 0 / .25);
    border: 1px solid color-mix(in srgb, var(--border-default) 50%, transparent);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.updates-header {
    position: relative;
    padding: 16px 24px;
    border-bottom: 1px solid color-mix(in srgb, var(--border-default) 50%, transparent);
}

.updates-title {
    font-size: 20px;
    line-height: 28px;
    font-weight: 500;
    color: var(--text-primary);
    text-align: center;
}

.updates-close {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
}

.updates-intro {
    color: var(--text-secondary);
    padding: 16px 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.updates-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 24px 24px;
    color: var(--text-secondary);
    gap: 24px;
}

.updates-summary {
    margin-bottom: 16px;
    font-weight: 600;
}

.updates-sections>*+* {
    margin-top: 32px;
}

.section-title {
    font-size: 18px;
    line-height: 28px;
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
}

.version-badge {
    display: inline-block;
    padding: 2px 8px;
    font-size: 12px;
    line-height: 16px;
    font-weight: 500;
    border-radius: 4px;
    border: 1px solid var(--border-strong);
    background: var(--surface-card);
    color: var(--text-secondary);
    user-select: none;
}

.updates-list {
    list-style: disc inside;
    margin-top: 8px;
}

.updates-list>*+* {
    margin-top: 4px;
}

.update-item {
    color: var(--text-primary);
}

.updates-footer {
    background: color-mix(in srgb, var(--surface-panel) 50%, transparent);
    padding: 16px 24px;
    border-top: 1px solid color-mix(in srgb, var(--border-strong) 30%, transparent);
    backdrop-filter: blur(8px);
}

.footer-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.footer-link {
    display: flex;
    align-items: center;
    gap: 8px;
}

.github-icon {
    width: 16px;
    height: 16px;
    color: var(--text-secondary);
}

.github-text {
    font-size: 14px;
    line-height: 20px;
    color: var(--text-secondary);
}

.github-link {
    color: var(--accent);
    text-decoration: underline;
    text-decoration-color: color-mix(in srgb, var(--accent) 50%, transparent);
    text-underline-offset: 2px;
    transition: text-decoration-color 150ms;
    margin-left: 4px;
}

.github-link:hover {
    text-decoration-color: var(--accent);
}

.close-button {
    padding: 8px 16px;
    cursor: pointer;
    background: var(--surface-card);
    color: var(--text-primary);
    border-radius: 8px;
    transition: background-color 200ms;
    font-size: 14px;
    line-height: 20px;
    font-weight: 500;
}

.close-button:hover {
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
</style>
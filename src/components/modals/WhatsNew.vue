<script
    setup
    lang="ts"
>
import { useI18n } from "vue-i18n"
import { platform } from "../../backends"
import { X, Info, ExternalLink } from "@lucide/vue"
import {
    Dialog,
    DialogPanel,
    DialogTitle,
    DialogDescription,
    TransitionRoot,
    TransitionChild
} from "@headlessui/vue"

defineProps<{
    show: boolean
}>()

defineEmits<{
    close: []
}>()

const { t } = useI18n()

const supportLinks = [
    {
        name: "Ko-fi",
        url: "https://ko-fi.com/bruhnn"
    },
    {
        name: "Afdian",
        url: "https://afdian.com/a/bruhnn"
    }
]

const otherUpdates = [
    "supporterActivation",
    "datingControls",
    "assetLoadingFix",
    "groupCameraFix",
    "minigames",
    "controls",
    "syncGroups",
    "sequences",
    "layers",
    "cutscenes",
    "modManager",
    "interface",
    "themes",
    "folders",
    "characters",
    "cutsceneVisibilityFix",
    "datingFixes"
]

const versions = [
    {
        version: "1.0.5-beta.1",
        highlights: [],
        changelog: [
            "whatsNew.screenshot",
            "whatsNew.loadChecklist",
            "whatsNew.translatedErrors"
        ]
    },
    {
        version: "1.0.4",
        highlights: [
            {
                title: "whatsNew.gameCutscenesTitle",
                description: "whatsNew.gameCutscenesDescription",
                video: "/docs/gameCutscene.mp4",
                supporter: false
            },
            {
                title: "whatsNew.backgroundsPanelTitle",
                description: "whatsNew.backgroundsPanelDescription",
                image: "/docs/gameBackgrounds.jpg",
                supporter: false
            }
        ],
        changelog: [
            "whatsNew.cutsceneLook",
            "whatsNew.recordedCutscenes",
            "whatsNew.downloadedBackgrounds"
        ]
    },
    {
        version: "1.0.3",
        highlights: [],
        changelog: [
            "whatsNew.cutsceneUpdates",
            "whatsNew.newCutscenes",
            "whatsNew.audioRetry",
            "whatsNew.gameBackgrounds",
            "whatsNew.backgroundsPanel",
            "whatsNew.machineId",
            "whatsNew.framingFix",
            "whatsNew.skeletonPaths"
        ]
    },
    {
        version: "1.0.2",
        highlights: [],
        changelog: [
            "whatsNew.datingAudio",
            "whatsNew.minigameAudio",
            "whatsNew.previewErrors"
        ]
    },
    {
        version: "1.0.1",
        highlights: [],
        changelog: [
            "whatsNew.pointAppearance",
            "whatsNew.dragPosition",
            "whatsNew.compactControls",
            "whatsNew.settingsScrolling"
        ]
    },
    {
        version: "1.0.0",
        highlights: [
            {
                title: "whatsNew.multiplePreviews",
                description: "whatsNew.grid",
                video: "/docs/resizeReorder.mp4",
                supporter: false
            },
            {
                title: "whatsNew.datingInteractions",
                description: "whatsNew.dating",
                video: "/docs/datingInteractions.mp4",
                supporter: true
            }
        ],
        changelog: otherUpdates.map(item => "whatsNew." + item)
    }
]

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
                                {{ t("whatsNew.title") }}
                            </DialogTitle>

                            <button type="button" :aria-label="t('common.close')"
                                class="preview-close-button updates-close" @click="$emit('close')">
                                <X :size="16" aria-hidden="true" />
                            </button>
                        </div>

                        <DialogDescription as="div" class="updates-content">
                            <section v-for="(release, index) in versions" :key="release.version"
                                class="version" :class="{ latest: index === 0 }">
                                <div class="version-label">
                                    <span class="version-dot" aria-hidden="true" />
                                    <h3 class="version-number">
                                        <span class="version-caption">{{ t("whatsNew.versionLabel") }}</span>
                                        {{ release.version }}
                                    </h3>
                                </div>

                                <div class="updates-sections">
                                    <section v-for="highlight in release.highlights" :key="highlight.title"
                                        class="update-feature">
                                        <h4 class="feature-title">{{ t(highlight.title) }}</h4>
                                        <p class="feature-description">
                                            {{ t(highlight.description) }}
                                            <template v-if="highlight.supporter">
                                                {{ t("whatsNew.supporterMessage") }}
                                                <template v-for="(link, linkIndex) in supportLinks" :key="link.name">
                                                    <span v-if="linkIndex > 0">{{ t("whatsNew.supportOr") }}</span>
                                                    <button type="button" class="supporter-link" @click="platform.openUrl(link.url)">
                                                        {{ link.name }}
                                                        <ExternalLink :size="12" aria-hidden="true" />
                                                    </button>
                                                </template>
                                            </template>
                                        </p>
                                        <img v-if="highlight.image" :src="highlight.image" class="update-video" alt="" />
                                        <video v-else :src="highlight.video" class="update-video" autoplay muted loop
                                            playsinline preload="metadata" disablepictureinpicture />
                                    </section>

                                    <section class="updates-section">
                                        <h4 v-if="release.highlights.length" class="feature-title">
                                            {{ t("whatsNew.changelog") }}
                                        </h4>
                                        <ul class="updates-list" :class="{ 'changelog-only': !release.highlights.length }">
                                            <li v-for="item in release.changelog" :key="item" class="update-item">
                                                {{ t(item) }}
                                            </li>
                                        </ul>
                                    </section>
                                </div>
                            </section>
                        </DialogDescription>

                        <div class="updates-footer">
                            <div class="footer-content">
                                <div class="footer-link">
                                    <Info class="github-icon" aria-hidden="true" />

                                    <button type="button" class="github-link"
                                        @click="platform.openUrl('https://github.com/bruhnn/BD2ModManager/issues')">
                                        {{ t("whatsNew.issue") }}
                                    </button>
                                </div>

                                <button type="button" class="close-button" @click="$emit('close')">
                                    {{ t("whatsNew.done") }}
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
:global(.updates-modal) {
    position: relative;
    z-index: 10000;
}

.updates-backdrop {
    position: fixed;
    z-index: 10000;
    inset: 0;
    background: color-mix(in srgb, var(--surface-app) 80%, transparent);
    backdrop-filter: blur(8px);
}

.updates-container {
    position: fixed;
    z-index: 10000;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
}

.updates-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 896px;
    max-height: 90vh;
    overflow: hidden;
    background: var(--surface-dialog);
    border: 1px solid var(--border-default);
    border-radius: 12px;
    box-shadow: 0 25px 50px -12px rgb(0 0 0 / 25%);
}


.updates-header {
    position: relative;
    flex-shrink: 0;
    padding: 16px 24px;
    border-bottom: 1px solid var(--border-default);
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
    top: 50%;
    right: 16px;
    transform: translateY(-50%);
}


.updates-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 24px;
    color: var(--text-secondary);
}

.version {
    position: relative;
    display: grid;
    grid-template-columns: 92px 1fr;
    gap: 12px;
    padding-bottom: 22px;
}

.version::before {
    content: "";
    position: absolute;
    left: 5px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--border-default);
}

.version:last-child {
    padding-bottom: 0;
}

.version:last-child::before {
    bottom: auto;
    height: 12px;
}

.version-label {
    position: sticky;
    top: 0;
    align-self: start;
    display: flex;
    gap: 12px;
    align-items: flex-start;
}

.version-dot {
    position: relative;
    z-index: 1;
    flex: none;
    width: 12px;
    height: 12px;
    margin-top: 6px;
    border-radius: 50%;
    background: var(--border-strong);
}

.version.latest .version-dot {
    background: var(--accent);
}

.version-number {
    font-size: 16px;
    line-height: 24px;
    font-weight: 600;
    color: var(--text-primary);
}

.version-caption {
    display: block;
    font-size: 10px;
    line-height: 16px;
    font-weight: 500;
    text-transform: uppercase;
    color: var(--text-secondary);
}


.updates-sections {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 28px;
}

.update-feature {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
}

.feature-title {
    font-size: 16px;
    line-height: 24px;
    font-weight: 600;
    color: var(--text-primary);
}

.feature-description {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-secondary);
}


.update-video {
    display: block;
    width: 100%;
    height: auto;
    border: 1px solid var(--border-default);
    border-radius: 8px;
    background: transparent;
}


.supporter-link {
    display: inline-flex;
    align-items: baseline;
    gap: 3px;
    padding: 0;
    cursor: pointer;
    font-size: inherit;
    line-height: inherit;
    color: var(--accent);
    vertical-align: baseline;
    transition: color 150ms;
}

.supporter-link:hover {
    color: var(--accent-hover);
    text-decoration: underline;
    text-underline-offset: 3px;
}

.supporter-link svg {
    align-self: center;
}


.updates-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
    padding-left: 20px;
    list-style: disc;
}

.updates-list.changelog-only {
    margin-top: 0;
}

.update-item {
    padding-left: 4px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-primary);
}

.update-item::marker {
    color: var(--text-secondary);
}


.updates-footer {
    flex-shrink: 0;
    padding: 16px 24px;
    background: color-mix(in srgb, var(--surface-panel) 50%, transparent);
    border-top: 1px solid var(--border-default);
}

.footer-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.footer-link {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

.github-icon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    color: var(--text-secondary);
}

.github-link {
    cursor: pointer;
    font-size: 14px;
    color: var(--accent);
    text-decoration: underline;
    text-decoration-color: color-mix(in srgb, var(--accent) 50%, transparent);
    text-underline-offset: 2px;
    transition: text-decoration-color 150ms;
}

.github-link:hover {
    text-decoration-color: var(--accent);
}

.close-button {
    flex-shrink: 0;
    padding: 8px 16px;
    cursor: pointer;
    background: var(--surface-card);
    color: var(--text-primary);
    border-radius: 8px;
    font-size: 14px;
    line-height: 20px;
    font-weight: 500;
    transition: background-color 200ms;
}

.close-button:hover {
    background: var(--state-hover);
}


.dialog-enter {
    transition:
        opacity 300ms ease-out,
        transform 300ms ease-out;
}

.dialog-leave {
    transition:
        opacity 200ms ease-in,
        transform 200ms ease-in;
}

.dialog-hidden {
    opacity: 0;
}

.dialog-visible {
    opacity: 1;
}

.panel-hidden {
    opacity: 0;
    transform: scale(0.95);
}

.panel-visible {
    opacity: 1;
    transform: scale(1);
}


@media (max-width: 640px) {
    .updates-container {
        padding: 12px;
    }

    .updates-panel {
        max-height: 95vh;
    }

    .updates-header,
    .updates-footer {
        padding: 14px 16px;
    }

    .updates-content {
        padding: 16px;
    }

    .updates-title {
        padding: 0 24px;
        font-size: 18px;
    }

    .updates-sections {
        gap: 24px;
    }

    .footer-content {
        gap: 12px;
    }

    .github-link {
        font-size: 12px;
    }
}

@media (max-width: 520px) {
    .version {
        grid-template-columns: 76px 1fr;
    }
}

@media (prefers-reduced-motion: reduce) {

    .dialog-enter,
    .dialog-leave {
        transition: none;
    }
}
</style>

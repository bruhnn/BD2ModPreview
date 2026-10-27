<script
	setup
	lang="ts"
>
import { computed, onMounted, ref, watch } from 'vue'
import { Plus, Search, ChevronDown, Info } from '@lucide/vue'

import { usePreviewDrag, type PreviewDropTarget } from '../composables/usePreviewDrag'

import { RadioGroup, RadioGroupOption } from '@headlessui/vue'

import { useLogger } from '../composables/useLogger'
import { usePreviewerStore } from '../stores/previewer'
import { useCharactersStore } from '../stores/characters'
import NoInternetState from './NoInternetState.vue'
import { useNetworkStatus } from '../composables/useNetworkStatus'
import { Character } from '../types/character'
import datingAssets from '../data/dating-assets.json'
import { minigameCatalog, type MinigameEntry } from '../data/minigames/catalog'

import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const {
	isConnected,
	isChecking,
	checkConnection
} = useNetworkStatus()
const props = defineProps<{
	visible?: boolean
}>()

const visibleOnce = computed(() => props.visible || alreadyOpened.value)

watch(() => props.visible, (v) => {
	if (v) alreadyOpened.value = true
})

const alreadyOpened = ref(false)

const { logMessage } = useLogger()
const previewerStore = usePreviewerStore()
const charactersStore = useCharactersStore()

const draggedCharacter = ref<Character | null>(null)
type MinigameCard = MinigameEntry & { character: Character; title: string; thumbnail: string }
const draggedMinigame = ref<MinigameCard | null>(null)
const dragCard = ref({ width: 0, height: 0, x: 0, y: 0, imageWidth: '', imageHeight: '', imageTransform: '', shadow: '' })

const { isDragging, hasDragged, dragPosition, dropTarget, startDrag, moveDrag, finishDrag, cancelDrag } = usePreviewDrag(target => {
	if (draggedMinigame.value) minigameClicked(draggedMinigame.value, target)
	else if (draggedCharacter.value) characterClicked(draggedCharacter.value, target)
}, true)

watch(() => props.visible, visible => { if (!visible) cancelDrag() })

const typeSelected = ref<keyof typeof characterTypeMap | "minigames">("standing")
const searchValue = ref('')
const sortValue = ref('newest')

// 'oldest', 'newest', 'a-z', 'z-a'

const characterTypeMap = {
	standing: { key: 'standing', image: 'character_image' },
	cutscene: { key: 'cutscene', image: 'skill_image' },
	dating: { key: 'dating_id', image: 'character_image' },
} as const

const filteredCharacters = computed(() => {
	if (typeSelected.value === "minigames") return []
	const config = characterTypeMap[typeSelected.value]

	if (!config) {
		return []
	}

	if (!charactersStore.characters) {
		logMessage('Characters not loaded yet', 'error')
		return []
	}

	let filtered = charactersStore.characters.filter(char => char[config.key])

	if (searchValue.value.trim() !== '') {
		const searchChar = searchValue.value.toLowerCase()
		filtered = filtered.filter(char =>
			`${charactersStore.getLocalizedName(char.character_name).toLowerCase()} ${charactersStore.getLocalizedName(char.costume_name).toLowerCase()}`.includes(searchChar)
		)
	}

	if (sortValue.value === 'oldest') {
		filtered.sort((a, b) => {
			const aDate = a.release_date ? new Date(a.release_date) : new Date('9999-12-31')
			const bDate = b.release_date ? new Date(b.release_date) : new Date('9999-12-31')
			return aDate.getTime() - bDate.getTime()
		})
	} else if (sortValue.value === 'newest') {
		filtered.sort((a, b) => {
			const aDate = a.release_date ? new Date(a.release_date) : new Date('1900-01-01')
			const bDate = b.release_date ? new Date(b.release_date) : new Date('1900-01-01')

			// if release_date is "UNRELEASED", put on top
			if (a.release_date === 'UNRELEASED') return -1
			if (b.release_date === 'UNRELEASED') return 1

			return bDate.getTime() - aDate.getTime()
		})
	} else if (sortValue.value === 'a-z') {
		filtered.sort((a, b) => charactersStore.getLocalizedName(a.character_name).localeCompare(charactersStore.getLocalizedName(b.character_name)))
	} else if (sortValue.value === 'z-a') {
		filtered.sort((a, b) => charactersStore.getLocalizedName(b.character_name).localeCompare(charactersStore.getLocalizedName(a.character_name)))
	}

	return filtered
})

const filteredMinigames = computed(() => {
	const search = searchValue.value.trim().toLowerCase()
	const items = minigameCatalog.flatMap(game => {
		const character = charactersStore.characters.find(char => char.costume_id === game.costumeId)
		if (!character) return []
		const title = `${charactersStore.getLocalizedName(character.character_name)} - ${charactersStore.getLocalizedName(character.costume_name)}`
		const thumbnail = `https://cdn.jsdelivr.net/gh/bruhnn/Brown-Dust-2-Asset@master/ui/illust/illust_inven_char/${character.assets.character_image}`
		return `${title} ${game.name}`.toLowerCase().includes(search) ? [{ ...game, character, title, thumbnail }] : []
	})
	if (sortValue.value === 'a-z') items.sort((a, b) => a.title.localeCompare(b.title))
	else if (sortValue.value === 'z-a') items.sort((a, b) => b.title.localeCompare(a.title))
	else items.sort((a, b) => {
		const aDate = a.character.release_date ?? ''
		const bDate = b.character.release_date ?? ''
		return sortValue.value === 'oldest' ? aDate.localeCompare(bDate) : bDate.localeCompare(aDate)
	})
	return items
})

const JSDELIVR_BASE_URL = "https://cdn.jsdelivr.net/gh/bruhnn/Brown-Dust-2-Asset@master/spine"
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/bruhnn/Brown-Dust-2-Asset/refs/heads/master/spine'
const ENDPOINTS = {
	standing: 'char',
	cutscene: 'cutscenes',
	dating: 'illust/illust_dating'
} as const

function startCharacterDrag(event: PointerEvent, character: Character) {
	draggedMinigame.value = null
	if (event.button !== 0) return
	const card = event.currentTarget as HTMLElement
	const bounds = card.getBoundingClientRect()
	const image = getComputedStyle(card.querySelector('img')!)
	dragCard.value = {
		width: bounds.width, height: bounds.height,
		x: event.clientX - bounds.left, y: event.clientY - bounds.top,
		imageWidth: image.width, imageHeight: image.height, imageTransform: image.transform,
		shadow: getComputedStyle(card).boxShadow,
	}
	draggedCharacter.value = character
	startDrag(event)
}

function getCharacterUrl(character: Character, type: keyof typeof ENDPOINTS): { skelUrl: string, atlasUrl: string, skelUrlFallback?: string, atlasUrlFallback?: string } | null {
	const endpoint = ENDPOINTS[type]

	let skelUrl
	let atlasUrl
	let filename: string | null = null

	switch (type) {
		case 'standing': {
			const filenames: Record<string, string> = {
				'065103': 'char065103/Char065103',
				'067003': 'char067003/Char067003',
			}
			filename = filenames[character.id] ?? `char${character.id}/char${character.id}`
			break
		}
		case 'cutscene': {
			const filenames: Record<string, string> = {
				'000203': 'cutscene_char000203/CutScene_Char000203',
				'001201': 'cutscene_char001201/CutScene_Char001201',
				'061002': 'cutscene_char061002/cutscene_Char061002',
				'061092': 'cutscene_char061092_a/cutscene_char061092_A',
			}
			filename = filenames[character.id] ?? `cutscene_char${character.id}/cutscene_char${character.id}`
			break
		}
		case 'dating': {
			const name = `illust_dating${character.dating_id}`
			const skeleton = (datingAssets as Record<string, string[]>)[name]?.[0] ?? name
			filename = `${skeleton}/${skeleton}`
			break
		}
	}

	if (!filename) {
		logMessage(`Invalid Character Type: ${type}`, "error")
		return null
	}

	skelUrl = `${filename}.skel`
	atlasUrl = `${filename}.atlas`

	if (!skelUrl || !atlasUrl) {
		return null
	}

	return {
		skelUrl: `${JSDELIVR_BASE_URL}/${endpoint}/${skelUrl}`,
		atlasUrl: `${JSDELIVR_BASE_URL}/${endpoint}/${atlasUrl}`,
		skelUrlFallback: `${GITHUB_BASE_URL}/${endpoint}/${skelUrl}`,
		atlasUrlFallback: `${GITHUB_BASE_URL}/${endpoint}/${atlasUrl}`
	}
}

function characterClicked(char: Character, target?: PreviewDropTarget) {
	if (typeSelected.value === "minigames") return
	const urls = getCharacterUrl(char, typeSelected.value)

	if (!urls) {
		logMessage(`Invalid Character Data. Could not find ${typeSelected.value} data for the selected character.`, "error")
		return
	}

	const title = t('preview.originalTitle', { character: charactersStore.getLocalizedName(char.character_name), costume: charactersStore.getLocalizedName(char.costume_name) })
	const source = {
		type: "url" as const,
		skeletonUrl: urls.skelUrl,
		atlasUrl: urls.atlasUrl,
		skeletonUrlFallback: urls.skelUrlFallback,
		atlasUrlFallback: urls.atlasUrlFallback,
	}
	if (target) previewerStore.openDroppedPreview(title, source, target)
	else previewerStore.openPreview(title, source)
}

function getThumbnail(character: Character) {
	if (typeSelected.value === "minigames") return
	const imageKey = characterTypeMap[typeSelected.value]
	const baseUrl = "https://cdn.jsdelivr.net/gh/bruhnn/Brown-Dust-2-Asset@master/ui/illust"

	if (!imageKey || !character.assets[imageKey.image]) {
		logMessage(`Invalid Character Data. Could not find image for ${charactersStore.getLocalizedName(character.character_name)} - ${charactersStore.getLocalizedName(character.costume_name)} (${character.id}) ${typeSelected.value} type.`, "error")
		return `${baseUrl}/illust_simple_char/illust_simple_char000201_2.png`
	}
	// standind and dating show the character image
	// cutscene shows the skill preview image
	if (imageKey.key === "standing" || imageKey.key === "dating_id") {
		return `${baseUrl}/illust_inven_char/${character.assets[imageKey.image]}`
	} else if (imageKey.key === "cutscene") {
		return `${baseUrl}/illust_skill_char/${character.assets[imageKey.image]}`
	}
}

function minigameClicked(game: MinigameCard, target?: PreviewDropTarget) {
	const source = {
		type: 'url' as const,
		initialAnimation: game.animation,
		skeletonUrl: `${JSDELIVR_BASE_URL}/${game.skeleton}`,
		atlasUrl: `${JSDELIVR_BASE_URL}/${game.atlas}`,
		skeletonUrlFallback: `${GITHUB_BASE_URL}/${game.skeleton}`,
		atlasUrlFallback: `${GITHUB_BASE_URL}/${game.atlas}`,
	}
	if (target) previewerStore.openDroppedPreview(`${game.title} - ${game.name}`, source, target)
	else previewerStore.openPreview(`${game.title} - ${game.name}`, source)
}

function startMinigameDrag(event: PointerEvent, game: MinigameCard) {
	if (event.button !== 0) return
	const card = event.currentTarget as HTMLElement
	const bounds = card.getBoundingClientRect()
	const image = getComputedStyle(card.querySelector('img')!)
	dragCard.value = {
		width: bounds.width, height: bounds.height,
		x: event.clientX - bounds.left, y: event.clientY - bounds.top,
		imageWidth: image.width, imageHeight: image.height, imageTransform: image.transform,
		shadow: getComputedStyle(card).boxShadow,
	}
	draggedCharacter.value = null
	draggedMinigame.value = game
	startDrag(event)
}

watch(typeSelected, cancelDrag)

onMounted(async () => {
	await checkConnection()
})
</script>

<template>
	<div class="characters-list">
		<Teleport to="body">
			<div v-if="isDragging && dropTarget" class="preview-drop-target" :style="{
				left: dropTarget.left + 'px', top: dropTarget.top + 'px',
				width: dropTarget.width + 'px', height: dropTarget.height + 'px',
			}" aria-hidden="true">
				<Plus :size="16" />
			</div>
			<div v-if="isDragging && hasDragged && draggedCharacter" class="character-drag-indicator character-ghost"
				:style="{
					left: dragPosition.x - dragCard.x + 'px', top: dragPosition.y - dragCard.y + 'px',
					width: dragCard.width + 'px', height: dragCard.height + 'px', boxShadow: dragCard.shadow,
				}" aria-hidden="true">
				<img :src="getThumbnail(draggedCharacter)" alt="" draggable="false" class="ghost-image"
					:style="{ width: dragCard.imageWidth, height: dragCard.imageHeight, transform: dragCard.imageTransform }" />
				<div class="character-caption">
					<h3 class="character-name">{{ charactersStore.getLocalizedName(draggedCharacter.character_name) }}</h3>
					<p class="character-costume">{{ charactersStore.getLocalizedName(draggedCharacter.costume_name) }}</p>
				</div>
			</div>
			<div v-if="isDragging && hasDragged && draggedMinigame" class="character-drag-indicator character-ghost"
				:style="{
					left: dragPosition.x - dragCard.x + 'px', top: dragPosition.y - dragCard.y + 'px',
					width: dragCard.width + 'px', height: dragCard.height + 'px', boxShadow: dragCard.shadow,
				}" aria-hidden="true">
				<img :src="draggedMinigame.thumbnail" alt="" draggable="false" class="ghost-image"
					:style="{ width: dragCard.imageWidth, height: dragCard.imageHeight, transform: dragCard.imageTransform }" />
				<div class="character-caption">
					<h3 class="character-name">{{ draggedMinigame.title }}</h3>
					<p class="character-costume">{{ draggedMinigame.name }}</p>
				</div>
			</div>
		</Teleport>
		<div class="characters-tabs">
			<RadioGroup v-model="typeSelected">
				<div class="tabs-row">
					<RadioGroupOption v-for="tab in ['standing', 'cutscene', 'dating', 'minigames']" :key="tab" :value="tab"
						v-slot="{ checked }" class="tab-option">
						<button class="tab-button" :class="{
							selected: checked,
						}">
							{{ t(`characterList.tabs.${tab}`) }}
						</button>
					</RadioGroupOption>
				</div>
			</RadioGroup>
		</div>

		<div class="characters-content">
			<!-- header -->
			<div>
				<div class="character-filters">
					<div class="search-field">
						<div class="search-icon">
							<Search :size="24" />
						</div>
						<input :disabled="!isConnected" type="search" v-model="searchValue"
							:placeholder="t('characterList.searchPlaceholder')" class="search-input" />
					</div>
					<div class="sort-field">
						<select v-model="sortValue" :disabled="!isConnected" class="sort-select">
							<option value="newest">{{ t('characterList.sort.newest') }}</option>
							<option value="oldest">{{ t('characterList.sort.oldest') }}</option>
							<option value="a-z">{{ t('characterList.sort.a_z') }}</option>
							<option value="z-a">{{ t('characterList.sort.z_a') }}</option>
						</select>
						<div class="sort-arrow">
							<ChevronDown :size="20" class="sort-icon" />
						</div>
					</div>
				</div>
				<div class="search-hint">
					<p class="search-hint-text">
						<Info class="hint-icon" />
						{{ t('characterList.information') }}
					</p>
				</div>
			</div>

			<div class="character-scroll scrollbar">
				<NoInternetState v-if="!isConnected" :is-checking="isChecking" @check-connection="checkConnection" />

				<template v-else-if="typeSelected === 'minigames'">
					<div v-if="!filteredMinigames.length" class="characters-empty">{{ t('characterList.noCharactersFound') }}</div>
					<div v-else class="character-grid">
						<div v-for="game in filteredMinigames" :key="game.id" class="character-card"
							:class="{ dragging: isDragging && hasDragged && draggedMinigame?.id === game.id }"
							role="button" tabindex="0" @click="!hasDragged && minigameClicked(game)"
							@keydown.enter.prevent="minigameClicked(game)" @keydown.space.prevent="minigameClicked(game)"
							@pointerdown.prevent="startMinigameDrag($event, game)" @pointermove="moveDrag"
							@pointerup="finishDrag" @pointercancel="cancelDrag" @lostpointercapture="cancelDrag"
							@keydown.esc="cancelDrag" @dragstart.prevent>
							<img v-if="visibleOnce" loading="lazy" draggable="false" :src="game.thumbnail" :alt="game.title" class="character-image" />
							<div class="character-caption">
								<h3 class="character-name">{{ game.title }}</h3>
								<p class="character-costume">{{ game.name }}</p>
							</div>
						</div>
					</div>
				</template>

				<div v-else-if="!charactersStore.characters" class="characters-empty">
					{{ t('characterList.loadingCharacters') }}
				</div>

				<div v-else-if="filteredCharacters.length === 0" class="characters-empty">
					{{ t('characterList.noCharactersFound') }}
				</div>

				<div v-else class="sort-field">
					<div class="character-grid">
						<div v-for="character in filteredCharacters" :key="character.id"
							@click="!hasDragged && characterClicked(character)"
							@pointerdown.prevent="startCharacterDrag($event, character)" @pointermove="moveDrag"
							@pointerup="finishDrag" @pointercancel="cancelDrag" @lostpointercapture="cancelDrag"
							@keydown.esc="cancelDrag" @dragstart.prevent
							:class="{ dragging: isDragging && hasDragged && draggedCharacter?.id === character.id }"
							class="character-card">
							<img v-if="visibleOnce" loading="lazy" draggable="false" :src="getThumbnail(character)"
								:alt="charactersStore.getLocalizedName(character.character_name)" class="character-image" />

							<div class="character-caption">
								<h3 class="character-name">{{ charactersStore.getLocalizedName(character.character_name) }}</h3>
								<p class="character-costume">{{ charactersStore.getLocalizedName(character.costume_name) }}</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
<style scoped>
.characters-list {
	height: 100%;
	display: flex;
	flex-direction: column;
	background: var(--surface-app);
	color: var(--text-primary);
}

.character-ghost {
	user-select: none;
	overflow: hidden;
	border-radius: 8px;
	background: var(--surface-panel);
	opacity: .6;
}

.ghost-image,
.character-image {
	flex: 1;
	object-fit: cover;
}

.character-caption {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	background: linear-gradient(to top, rgb(0 0 0 / .8), transparent);
	padding: 32px 12px 12px;
}

.character-name {
	font-weight: 700;
	color: white;
}

.character-costume {
	font-size: 14px;
	line-height: 20px;
	color: rgb(255 255 255 / .8);
}

.characters-tabs {
	display: flex;
	gap: 8px;
	flex-direction: column;
	margin-bottom: 8px;
	flex-shrink: 0;
}

.tabs-row {
	display: flex;
	justify-content: space-evenly;
	background: color-mix(in srgb, var(--surface-panel) 60%, transparent);
	padding: 16px 8px;
	gap: 4px;
	flex-shrink: 0;
}

.tab-option {
	width: 100%;
}

.tab-option+.tab-option {
	margin-left: 4px;
}

.tab-button {
	cursor: pointer;
	width: 100%;
	border-radius: 8px;
	padding: 10px 0;
	font-size: 14px;
	font-weight: 500;
	line-height: 20px;
	color: var(--text-secondary);
}

.tab-button:hover {
	background: color-mix(in srgb, var(--state-hover) 70%, transparent);
}

.tab-button:focus {
	outline: none;
	box-shadow: 0 0 0 2px var(--surface-panel), 0 0 0 4px var(--accent);
}

.tab-button:active {
	outline: none;
	box-shadow: none;
}

.tab-button.selected {
	background: var(--surface-card);
	color: var(--text-primary);
	box-shadow: 0 1px 3px rgb(0 0 0 / .1), 0 1px 2px -1px rgb(0 0 0 / .1);
}

.tab-button.selected:hover {
	background: color-mix(in srgb, var(--state-hover) 50%, transparent);
}

.characters-content {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	padding: 0 8px;
	gap: 16px;
}

.character-filters {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.search-field {
	position: relative;
	flex-shrink: 0;
	flex: 1;
}

.search-icon {
	position: absolute;
	top: 0;
	bottom: 0;
	left: 0;
	padding-left: 12px;
	display: flex;
	align-items: center;
	pointer-events: none;
}

.search-input {
	width: 100%;
	padding: 12px 16px 12px 40px;
}

.search-input,
.sort-select {
	background: var(--surface-input);
	border: 1px solid var(--border-default);
	border-radius: 8px;
	color: var(--text-primary);
	transition: background-color 200ms, border-color 200ms, box-shadow 200ms;
}

.search-input::placeholder {
	color: var(--text-muted);
}

.search-input:focus,
.sort-select:focus {
	outline: none;
	box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 50%, transparent);
	border-color: color-mix(in srgb, var(--accent) 50%, transparent);
}

.search-input:hover,
.sort-select:hover {
	background: var(--state-hover);
}

.sort-field {
	position: relative;
}

.sort-select {
	appearance: none;
	padding: 12px 40px 12px 16px;
	cursor: pointer;
	min-width: 120px;
}

.sort-arrow {
	position: absolute;
	top: 0;
	bottom: 0;
	right: 0;
	padding-right: 12px;
	display: flex;
	align-items: center;
	pointer-events: none;
}

.sort-icon {
	color: var(--text-secondary);
}

.search-hint {
	margin-top: 8px;
	padding: 8px;
	background: color-mix(in srgb, var(--surface-panel) 40%, transparent);
	border: 1px solid color-mix(in srgb, var(--border-default) 30%, transparent);
	border-radius: 6px;
}

.search-hint-text {
	font-size: 12px;
	line-height: 16px;
	color: var(--text-secondary);
	display: flex;
	align-items: center;
}

.hint-icon {
	width: 16px;
	height: 16px;
	margin-right: 6px;
	color: var(--accent);
}

.character-scroll {
	overflow-y: auto;
	flex: 1;
	min-height: 0;
	padding-right: 4px;
	padding-bottom: 16px;
	user-select: none;
}

.character-scroll:focus {
	outline: none;
}

.characters-empty {
	text-align: center;
	color: var(--text-secondary);
}

.character-grid {
	display: grid;
	grid-template-columns: repeat(1, minmax(0, 1fr));
	gap: 16px;
}

@media (min-width: 640px) {
	.character-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (min-width: 1280px) {
	.character-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
}

.character-card {
	position: relative;
	cursor: pointer;
	user-select: none;
	overflow: hidden;
	border-radius: 8px;
	background: var(--surface-panel);
	box-shadow: 0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1);
	transition: box-shadow 300ms ease-in-out, opacity 300ms ease-in-out;
}

.character-card:hover {
	box-shadow: 0 20px 25px -5px rgb(0 0 0 / .1), 0 8px 10px -6px rgb(0 0 0 / .1);
}

.character-card.dragging {
	opacity: .6;
}

.character-image {
	transition: transform 300ms ease-in-out;
}

.character-card:hover .character-image {
	transform: scale(1.15);
}

.preview-drop-target {
	position: fixed;
	z-index: 200;
	display: flex;
	align-items: center;
	justify-content: center;
	pointer-events: none;
	border: 1px solid var(--accent);
	border-radius: 4px;
	background: var(--surface-popover);
	color: var(--accent);
}

.character-drag-indicator {
	position: fixed;
	z-index: 201;
	pointer-events: none;
}
</style>

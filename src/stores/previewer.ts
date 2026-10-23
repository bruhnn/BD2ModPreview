import { defineStore } from "pinia";
import { ref, computed, readonly } from "vue";
import { useLocalStorage } from "@vueuse/core";
import type { AnimationSequence, SpineSource } from "../types/spine";
import type { PreviewDropTarget } from "../composables/usePreviewDrag";
import { i18n } from "../i18n";

export type Position = { row: number; column: number };
export type PreviewBackground =
	| { type: "theme" }
	| { type: "color"; color: string }
	| { type: "image"; path: string };

export interface Previewer {
	pos: Position;
	id: string;
	title: string;
	source: SpineSource | null;
	isLoading: boolean;
	syncGroup: number | null;
	settings: {
		currentAnimation: string | null;
		followGlobalAnimation: boolean;
		paused: boolean;
		loopAnimation: boolean;
		premultipliedAlpha: boolean;
		background: PreviewBackground;
	};
	allAnimations: string[];
}

export interface CameraChange {
	sourceId: string;
	groupId: number;
	zoomRatio: number;
	dx: number;
	dy: number;
	anchorX: number;
	anchorY: number;
}

export type PreviewControl =
	| { type: "pause" | "loop"; value: boolean }
	| { type: "animation"; value: string }
	| { type: "seek"; time: number }
	| { type: "sequence"; sequence: AnimationSequence }
	| {
			type:
				| "restart"
				| "fit"
				| "center"
				| "resetCamera"
				| "cutscene"
				| "stopSequence";
	  };

export const usePreviewerStore = defineStore("previewer", () => {
	const savedSequences = useLocalStorage<Record<string, AnimationSequence[]>>(
		"PREVIEW_SEQUENCES",
		{},
	);
	const previewers = ref<Previewer[]>([]);
	const previewLimitReached = computed(() => previewers.value.length >= 12);
	const globalAnimation = ref("");
	const premultipliedAlpha = ref(false);
	const restartCount = ref(0);
	const cameraChange = ref<CameraChange | null>(null);
	const controlChange = ref<{
		sourceId: string;
		groupId: number;
		control: PreviewControl;
	} | null>(null);
	const paused = computed({
		get: () =>
			previewers.value.length > 0 &&
			previewers.value.every((p) => p.settings.paused),
		set: (value: boolean) =>
			previewers.value.forEach((p) => (p.settings.paused = value)),
	});
	const lastRow = computed(() =>
		previewers.value.length
			? Math.max(...previewers.value.map((p) => p.pos.row))
			: 0,
	);

	function getPreview(id: string): Previewer | undefined {
		return previewers.value.find((p) => p.id === id);
	}

	function toggleSyncGroup(id: string, group: number): void {
		const preview = getPreview(id);
		if (preview)
			preview.syncGroup = preview.syncGroup === group ? null : group;
	}

	function broadcastControl(sourceId: string, control: PreviewControl): void {
		const source = getPreview(sourceId);
		if (!source?.syncGroup) return;
		controlChange.value = { sourceId, groupId: source.syncGroup, control };
	}

	function broadcastCameraChange(
		sourceId: string,
		change: Omit<CameraChange, "sourceId" | "groupId">,
	): void {
		const source = getPreview(sourceId);
		if (!source?.syncGroup) return;
		cameraChange.value = {
			...change,
			sourceId,
			groupId: source.syncGroup,
		};
	}

	function openPreview(
		title: string,
		source: SpineSource | null = null,
		position?: Position | null,
	): string | null {
		const empty = previewers.value.find((p) => !p.source);
		if (source && empty && !position) {
			empty.title = title;
			empty.source = source;
			return empty.id;
		}
		if (previewLimitReached.value) return null;
		const id = crypto.randomUUID();
		const row = lastRow.value;
		const count = previewers.value.filter((p) => p.pos.row === row).length;
		const pos = position ?? {
			row: count < 2 ? row : row + 1,
			column: count < 2 ? count : 0,
		};
		previewers.value.push({
			id,
			title,
			source,
			pos,
			isLoading: false,
			syncGroup: null,
			settings: {
				currentAnimation: null,
				followGlobalAnimation: true,
				paused: paused.value,
				loopAnimation: true,
				premultipliedAlpha: premultipliedAlpha.value,
				background: { type: "theme" },
			},
			allAnimations: [],
		});
		return id;
	}

	function openDroppedPreview(
		title: string,
		source: SpineSource,
		target: PreviewDropTarget,
	) {
		const empty = target.previewId
			? getPreview(target.previewId)
			: undefined;
		if (empty && !empty.source) {
			empty.title = title;
			empty.source = source;
			return;
		}
		const id = openPreview(title, source, {
			row: lastRow.value + 1,
			column: 0,
		});
		if (id) movePreview(id, target.row, target.column, target.newRow);
	}

	function closePreview(id: string): boolean {
		const index = previewers.value.findIndex((p) => p.id === id);
		if (index < 0) return false;
		previewers.value.splice(index, 1);
		if (!previewers.value.length)
			openPreview(i18n.global.t("preview.newPreview"));
		return true;
	}

	function movePreview(
		id: string,
		row: number,
		column: number,
		newRow: boolean,
	) {
		const preview = getPreview(id);
		if (!preview) return;
		const rows = [...new Set(previewers.value.map((p) => p.pos.row))]
			.sort((a, b) => a - b)
			.map((row) => ({
				row,
				previews: previewers.value
					.filter((p) => p.pos.row === row)
					.sort((a, b) => a.pos.column - b.pos.column),
			}));
		const source = rows.find((r) => r.row === preview.pos.row)!;
		const sourceIndex = source.previews.indexOf(preview);
		const target = rows.find((r) => r.row === row);
		source.previews.splice(sourceIndex, 1);
		if (newRow) {
			const index = rows.findIndex((r) => r.row >= row);
			rows.splice(index === -1 ? rows.length : index, 0, {
				row,
				previews: [preview],
			});
		} else if (target) {
			if (source === target && sourceIndex < column) column--;
			target.previews.splice(column, 0, preview);
		}
		rows.filter((r) => r.previews.length).forEach((r, row) => {
			r.previews.forEach((p, column) => (p.pos = { row, column }));
		});
	}

	function changeAnimationForAll(animation: string): void {
		globalAnimation.value = animation;
		for (const p of previewers.value) {
			if (
				p.settings.followGlobalAnimation &&
				p.allAnimations.includes(animation)
			)
				p.settings.currentAnimation = animation;
		}
	}

	function setPremultipliedAlpha(value: boolean): void {
		premultipliedAlpha.value = value;
		previewers.value.forEach(
			(p) => (p.settings.premultipliedAlpha = value),
		);
	}
	function setLoopAnimationForAll(value: boolean): void {
		previewers.value.forEach((p) => (p.settings.loopAnimation = value));
	}
	function setBackgroundColorForAll(color: string): void {
		previewers.value.forEach(
			(p) => (p.settings.background = { type: "color", color }),
		);
	}
	function setBackgroundImageForAll(path: string): void {
		previewers.value.forEach(
			(p) => (p.settings.background = { type: "image", path }),
		);
	}
	function resetBackgroundForAll(): void {
		previewers.value.forEach(
			(p) => (p.settings.background = { type: "theme" }),
		);
	}

	return {
		previewers,
		savedSequences,
		previewLimitReached: readonly(previewLimitReached),
		restartCount,
		premultipliedAlpha: readonly(premultipliedAlpha),
		paused,
		globalAnimation: readonly(globalAnimation),
		cameraChange: readonly(cameraChange),
		controlChange: readonly(controlChange),
		toggleSyncGroup,
		broadcastControl,
		broadcastCameraChange,
		openPreview,
		openDroppedPreview,
		closePreview,
		getPreview,
		changeAnimationForAll,
		movePreview,
		setPremultipliedAlpha,
		setLoopAnimationForAll,
		setBackgroundColorForAll,
		setBackgroundImageForAll,
		resetBackgroundForAll,
	};
});

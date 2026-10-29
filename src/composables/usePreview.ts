import { computed, onUnmounted, ref, Ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { invoke } from "@tauri-apps/api/core";
import { usePreviewerStore, type PreviewControl } from "../stores/previewer";
import { useHistory } from "./useHistory";
import { useLogger } from "./useLogger";
import { useGameCutscene } from "./useGameCutscene";
import { useMinigameInteractions } from "./useMinigameInteractions";
import { useDatingInteractions } from "./useDatingInteractions";
import type {
	SpineAssetsData,
	SpinePlayer,
	AnimationSequence,
} from "../types/spine";
declare const spine: any;
export function usePreview(
	id: string,
	playerContainer: Ref<HTMLElement | null>,
) {
	const previewerStore = usePreviewerStore();
	const { logMessage } = useLogger();
	const { addToHistory } = useHistory();
	const { t, te } = useI18n();
	const cutscene = useGameCutscene();
	const minigame = useMinigameInteractions();
	const datingInteraction = useDatingInteractions((animation) => {
		if (!settings.value) return;
		settings.value.followGlobalAnimation = false;
		settings.value.currentAnimation = animation;
	}, (player) => {
		if (!preview.value) return;
		preview.value.allAnimations = player.skeleton.data.animations.map((animation: any) => animation.name);
		layers.value = player.skeleton.data.slots.map((slot: any) => slot.name);
		skins.value = player.skeleton.data.skins.map((skin: any) => skin.name);
		skin.value = player.skeleton.data.defaultSkin?.name ?? "";
		hiddenLayers.value = [];
		highlightedLayer.value = "";
		hiddenAttachments.clear();
	}, (message) => logMessage(message, "error"));
	const error = ref("");
	const retryCount = ref(0);
	const activeSequence = ref<AnimationSequence | null>(null);
	const playbackTime = ref(0);
	const duration = ref(0);
	const layers = ref<string[]>([]);
	const highlightedLayer = ref("");
	const hiddenLayers = ref<string[]>([]);
	const skins = ref<string[]>([]);
	const skin = ref("");
	const hiddenAttachments = new Map<any, any>();
	let loadId = 0;
	let spinePlayer: SpinePlayer | null = null;
	let previousCamera: typeof camera = null;
	let camera: { x: number; y: number; zoom: number } | null = null;
	let initialCamera: { x: number; y: number; zoom: number } | null = null;
	let defaultZoom = 1;
	let cameraListeners: AbortController | null = null;
	const preview = computed(() => previewerStore.getPreview(id));
	const isLoading = computed(() => preview.value?.isLoading ?? false);
	const title = computed(() => preview.value?.title ?? "");
	const source = computed(() => preview.value?.source ?? null);
	const settings = computed(() => preview.value?.settings ?? null);
	const currentAnimation = computed(
		() => preview.value?.settings.currentAnimation ?? null,
	);
	const allAnimations = computed(() => preview.value?.allAnimations ?? []);
	const paused = computed({
		get: () => settings.value?.paused ?? false,
		set: (value: boolean) => runControl({ type: "pause", value }),
	});
	const animationSelection = computed({
		get: () =>
			settings.value?.followGlobalAnimation
				? ""
				: (currentAnimation.value ?? ""),
		set: (value: string) => runControl({ type: "animation", value }),
	});
	const loopAnimation = computed({
		get: () => settings.value?.loopAnimation ?? true,
		set: (value: boolean) => runControl({ type: "loop", value }),
	});
	function runControl(control: PreviewControl) {
		applyControl(control);
		previewerStore.broadcastControl(id, control);
	}
	function applyControl(control: PreviewControl) {
		if (!spinePlayer || !settings.value) return;
		switch (control.type) {
			case "pause":
				settings.value.paused = control.value;
				break;
			case "loop":
				settings.value.loopAnimation = control.value;
				break;
			case "animation": {
				if (datingInteraction.enabled.value || minigame.enabled.value) return;
				const animation = control.value || previewerStore.globalAnimation || allAnimations.value[0];
				if (!allAnimations.value.includes(animation)) return;
				stopGameCutscene();
				stopSequence();
				settings.value.followGlobalAnimation = control.value === "";
				settings.value.currentAnimation = animation;
				restart();
				break;
			}
			case "seek": seekTo(control.time); break;
			case "restart": restart(); break;
			case "fit": fitCharacter(); break;
			case "center": centerCharacter(); break;
			case "resetCamera": resetCamera(); break;
			case "cutscene": playGameCutscene(); break;
			case "stopSequence": stopSequence(); break;
			case "sequence":
				if (control.sequence.steps.every(step => step.every(entry => allAnimations.value.includes(entry.animation))))
					playSequence(control.sequence);
				break;
		}
	}

	const sequenceKey = computed(() => {
		const value = source.value;
		if (!value) return "";
		return value.type === "folder"
			? "folder:" +
					value.path
						.replace(/\\/g, "/")
						.replace(/\/+$/, "")
						.toLowerCase()
			: "url:" + JSON.stringify([value.skeletonUrl, value.atlasUrl]);
	});
	const sequences = computed(
		() => previewerStore.savedSequences[sequenceKey.value] ?? [],
	);
	function playGameCutscene() {
		if (!spinePlayer || !settings.value || !cutscene.available.value)
			return;
		stopSequence();
		datingInteraction.enabled.value = false;
		minigame.enabled.value = false;
		if (!cutscene.active.value)
			previousCamera = camera ? { ...camera } : null;
		camera = {
			x: 0,
			y: 0,
			zoom:
				1600 /
				Math.min(
					spinePlayer.canvas.clientWidth,
					spinePlayer.canvas.clientHeight,
				),
		};
		settings.value.followGlobalAnimation = false;
		cutscene.start();
		playbackTime.value = 0;
		duration.value = cutscene.duration;
		settings.value!.paused = false;
	}
	function stopGameCutscene() {
		if (!cutscene.active.value) return;
		cutscene.active.value = false;
		camera = previousCamera;
		previousCamera = null;
	}
	function playSequence(sequence: AnimationSequence) {
		if (!spinePlayer || !settings.value) return;
		datingInteraction.enabled.value = false;
		minigame.enabled.value = false;
		stopGameCutscene();
		activeSequence.value = sequence;
		settings.value.followGlobalAnimation = false;
		spinePlayer.animationState.clearTracks();
		playbackTime.value = 0;
		applySequence(0);
		settings.value!.paused = false;
		spinePlayer.play();
	}
	function stopSequence() {
		if (!activeSequence.value) return;
		activeSequence.value = null;
		if (spinePlayer && currentAnimation.value) {
			spinePlayer.setAnimation(
				currentAnimation.value,
				settings.value?.loopAnimation ?? true,
			);
			applyPose();
		}
	}
	function applySequence(time: number) {
		if (!spinePlayer || !activeSequence.value) return;
		const skeleton = spinePlayer.skeleton;
		const steps = activeSequence.value.steps.map((step) =>
			step.map((entry) => ({
				...entry,
				animation: skeleton.data.findAnimation(entry.animation),
			})),
		);
		const lengths = steps.map((step) =>
			Math.max(
				0,
				...step.map(
					(entry) =>
						entry.delay +
						(entry.duration ?? entry.animation?.duration ?? 0),
				),
			),
		);
		duration.value = lengths.reduce((total, length) => total + length, 0);
		const position =
			settings.value?.loopAnimation && duration.value > 0
				? time % duration.value
				: Math.min(time, duration.value);
		playbackTime.value = position;
		let start = 0;
		let index = 0;
		while (index < steps.length - 1 && position >= start + lengths[index]) {
			start += lengths[index++];
		}
		skeleton.setToSetupPose();
		// Each row overlays the rows before it. Finished rows hold their last pose.
		for (const entry of steps[index] ?? []) {
			if (!entry.animation || position - start < entry.delay) continue;
			const elapsed = Math.min(
				position - start - entry.delay,
				entry.duration ?? entry.animation.duration,
			);
			entry.animation.apply(
				skeleton,
				-1,
				entry.loop
					? elapsed
					: Math.min(elapsed, entry.animation.duration),
				!!entry.loop,
				null,
				1,
				spine.MixBlend.replace,
				spine.MixDirection.mixIn,
			);
		}
		skeleton.updateWorldTransform();
	}
	function fitCharacter() {
		if (!spinePlayer) return;
		const offset = new spine.Vector2();
		const size = new spine.Vector2();
		spinePlayer.skeleton.getBounds(offset, size, []);
		const canvas = spinePlayer.canvas;
		if (!canvas.clientWidth || !canvas.clientHeight || !size.x || !size.y)
			return;
		defaultZoom =
			Math.max(
				size.x / canvas.clientWidth,
				size.y / canvas.clientHeight,
			) * 1.2;
		camera = {
			x: offset.x + size.x / 2,
			y: offset.y + size.y / 2,
			zoom: defaultZoom,
		};
	}
	function centerCharacter() {
		if (!spinePlayer || !camera) return;
		const offset = new spine.Vector2();
		const size = new spine.Vector2();
		spinePlayer.skeleton.getBounds(offset, size, []);
		camera.x = offset.x + size.x / 2;
		camera.y = offset.y + size.y / 2;
	}
	function resetCamera() {
		if (initialCamera) {
			camera = { ...initialCamera };
			defaultZoom = initialCamera.zoom;
		}
	}
	function setupCamera(player: SpinePlayer) {
		fitCharacter();
		initialCamera = camera ? { ...camera } : null;
		const canvas = player.canvas;
		cameraListeners = new AbortController();
		const { signal } = cameraListeners;
		let drag: { id: number; x: number; y: number } | null = null;
		canvas.style.touchAction = "none";
		window.addEventListener("blur", () => minigame.cancel(), { signal });
		canvas.addEventListener(
			"pointerdown",
			(event) => {
				if (event.button !== 0 && event.button !== 1) return;
				if (
					!activeSequence.value &&
					(minigame.pointerDown(event) || datingInteraction.pointerDown(event))
				) {
					settings.value!.paused = false;
					player.play();
					return;
				}
				event.preventDefault();
				canvas.setPointerCapture(event.pointerId);
				drag = {
					id: event.pointerId,
					x: event.clientX,
					y: event.clientY,
				};
			},
			{ signal },
		);
		canvas.addEventListener("pointerleave", datingInteraction.pointerLeave, { signal });
		canvas.addEventListener(
			"pointermove",
			(event) => {
				if (minigame.pointerMove(event) || datingInteraction.pointerMove(event)) return;
				if (!camera || !drag || drag.id !== event.pointerId) return;
				const dx = event.clientX - drag.x;
				const dy = event.clientY - drag.y;
				camera.x -= dx * camera.zoom;
				camera.y += dy * camera.zoom;
				drag.x = event.clientX;
				drag.y = event.clientY;
				const width = canvas.clientWidth;
				const height = canvas.clientHeight;
				if (width && height)
					previewerStore.broadcastCameraChange(id, {
						zoomRatio: 1,
						dx: dx / width,
						dy: dy / height,
						anchorX: 0,
						anchorY: 0,
					});
			},
			{ signal },
		);
		canvas.addEventListener(
			"pointerup",
			(event) => {
				if (minigame.pointerUp(event) || datingInteraction.pointerUp(event)) return;
				if (drag?.id !== event.pointerId) return;
				canvas.releasePointerCapture(event.pointerId);
				drag = null;
			},
			{ signal },
		);
		canvas.addEventListener(
			"lostpointercapture",
			(event) => {
				datingInteraction.releaseMarker(event);
				minigame.cancel(event.pointerId);
				drag = null;
				datingInteraction.cancelHold();
				datingInteraction.cancelDrag();
			},
			{ signal },
		);
		canvas.addEventListener(
			"pointercancel",
			(event) => {
				datingInteraction.releaseMarker(event);
				minigame.cancel(event.pointerId);
				drag = null;
				datingInteraction.cancelHold();
				datingInteraction.cancelDrag();
			},
			{ signal },
		);
		canvas.addEventListener(
			"wheel",
			(event) => {
				if (!camera) return;
				event.preventDefault();
				const rect = canvas.getBoundingClientRect();
				const x = event.clientX - rect.left - rect.width / 2;
				const y = rect.height / 2 - (event.clientY - rect.top);
				const delta =
					event.deltaY *
					(event.deltaMode === 1
						? 16
						: event.deltaMode === 2
							? rect.height
							: 1);
				const zoom = Math.min(
					defaultZoom * 100,
					Math.max(
						defaultZoom * 0.001,
						camera.zoom * Math.exp(delta * 0.001),
					),
				);
				// Keep the point under the cursor in place.
				const oldZoom = camera.zoom;
				camera.x += x * (oldZoom - zoom);
				camera.y += y * (oldZoom - zoom);
				camera.zoom = zoom;
				if (
					rect.width &&
					rect.height &&
					oldZoom > 0 &&
					zoom !== oldZoom
				) {
					previewerStore.broadcastCameraChange(id, {
						zoomRatio: zoom / oldZoom,
						dx: 0,
						dy: 0,
						anchorX: x / rect.width,
						anchorY: y / rect.height,
					});
				}
			},
			{ signal, passive: false },
		);
		canvas.addEventListener(
			"dblclick",
			() => {
				if (!datingInteraction.enabled.value && !minigame.enabled.value) runControl({ type: "fit" });
			},
			{ signal },
		);
	}
	function applyPose() {
		if (!spinePlayer) return;
		spinePlayer.skeleton.setToSetupPose();
		spinePlayer.animationState.apply(spinePlayer.skeleton);
		spinePlayer.skeleton.updateWorldTransform();
	}
	function restart() {
		if (!spinePlayer) return;
		if (datingInteraction.enabled.value) {
			datingInteraction.restart();
			playbackTime.value = 0;
			return;
		}
		datingInteraction.reset();
		if (minigame.enabled.value) {
			minigame.reset();
			return;
		}
		if (cutscene.active.value) {
			cutscene.seek(0);
			playbackTime.value = 0;
			return;
		}
		if (activeSequence.value) {
			applySequence(0);
			return;
		}
		for (const track of spinePlayer.animationState.tracks) {
			if (!track) continue;
			track.trackTime = 0;
			track.trackLast = -1;
			track.nextTrackLast = -1;
			track.animationLast = -1;
			track.nextAnimationLast = -1;
			track.mixingFrom = null;
		}
		applyPose();
		playbackTime.value = 0;
	}
	function seekTo(value: number) {
		if (!spinePlayer || !duration.value || minigame.enabled.value) return;
		datingInteraction.reset();
		settings.value!.paused = true;
		spinePlayer.pause();
		const time = Math.max(0, Math.min(value, duration.value));
		if (cutscene.active.value) {
			cutscene.seek(time);
			playbackTime.value = time;
			return;
		}
		if (activeSequence.value) {
			applySequence(time);
			return;
		}
		for (const track of spinePlayer.animationState.tracks) {
			if (!track) continue;
			track.trackTime = time;
			track.trackLast = time;
			track.nextTrackLast = time;
			track.mixingFrom = null;
		}
		applyPose();
		playbackTime.value = time;
	}
	function onPlayerUpdate(player: SpinePlayer, delta: number) {
		if (activeSequence.value) applySequence(playbackTime.value + delta);
		if (camera) {
			const rendererCamera = player.sceneRenderer.camera;
			rendererCamera.position.x = camera.x;
			rendererCamera.position.y = camera.y;
			// Store zoom in CSS pixels so resizing keeps the same scale.
			rendererCamera.zoom =
				(camera.zoom * player.canvas.clientWidth) / player.canvas.width;
			rendererCamera.update();
		}
		for (const slot of player.skeleton.slots) {
			if (hiddenLayers.value.includes(slot.data.name)) {
				hiddenAttachments.set(slot, slot.attachment);
				slot.attachment = null;
			}
		}
		if (cutscene.active.value) {
			playbackTime.value = cutscene.update(
				delta,
				settings.value?.loopAnimation ?? true,
			);
			duration.value = cutscene.duration;
		} else if (!activeSequence.value) {
			const track = player.animationState.getCurrent(0);
			duration.value = track?.animation.duration ?? 0;
			playbackTime.value = track?.getAnimationTime() ?? 0;
		}
	}
	function showError(reason: unknown, request: number) {
		if (request !== loadId) return;
		const detail = reason as { type?: string; message?: unknown };
		error.value =
			detail?.type && te("errors." + detail.type + ".message")
				? t("errors." + detail.type + ".message")
				: reason instanceof Error
					? reason.message
					: typeof reason === "string"
						? reason
						: t("preview.loadFailed");
		if (preview.value) preview.value.isLoading = false;
		logMessage(
			JSON.stringify(reason instanceof Error ? reason.message : reason),
			"error",
		);
	}
	async function loadSpineFromFolder(path: string, request: number) {
		const assets = await invoke<SpineAssetsData>("get_spine_assets", {
			folderPath: path,
		});
		if (request !== loadId) return;
		if (!assets.skeletonFilename || !assets.atlasFilename)
			throw new Error(t("preview.missingAssets"));
		const firstPart = Object.keys(assets.rawData ?? {}).sort().find((name) => /^illust_dating\d+_1\.(skel|json)$/i.test(name));
		if (firstPart && assets.rawData?.[firstPart.replace(/\.(skel|json)$/i, ".atlas")]) {
			assets.skeletonFilename = firstPart;
			assets.atlasFilename = firstPart.replace(/\.(skel|json)$/i, ".atlas");
		}
		initializePlayer(createPlayerConfig(assets), request);
	}
	function loadSpineFromUrl(
		skeletonUrl: string,
		atlasUrl: string,
		request: number,
		fallbackSkeleton?: string,
		fallbackAtlas?: string,
	) {
		const config = createPlayerConfig({
			skeletonFilename: skeletonUrl,
			atlasFilename: atlasUrl,
		});
		config.error = (_player: SpinePlayer, message: string) => {
			if (request !== loadId) return;
			if (fallbackSkeleton && fallbackAtlas) {
				try {
					loadSpineFromUrl(fallbackSkeleton, fallbackAtlas, request);
				} catch (error) {
					showError(error, request);
				}
			} else showError(message, request);
		};
		initializePlayer(config, request);
	}
	function createPlayerConfig(assetsData: SpineAssetsData) {
		const config: any = {
			atlasUrl: assetsData.atlasFilename,
			showControls: false,
			alpha: true,
			showLoading: true,
			premultipliedAlpha: settings.value?.premultipliedAlpha,
			draw: (player: SpinePlayer) => {
				// Hide layers only while drawing; keep the animation's attachments.
				for (const [slot, attachment] of hiddenAttachments)
					slot.attachment = attachment;
				hiddenAttachments.clear();
				if (cutscene.draw()) return;
				if (playerContainer.value) datingInteraction.updateMarkers(playerContainer.value.getBoundingClientRect());
				if (!highlightedLayer.value) return;
				const slot = player.skeleton.findSlot(highlightedLayer.value);
				if (!slot?.bone.active || !slot.attachment) return;
				const attachment = slot.attachment;
				const vertices: number[] = [];
				if (attachment instanceof spine.RegionAttachment) {
					attachment.computeWorldVertices(slot, vertices, 0, 2);
				} else if (attachment instanceof spine.MeshAttachment) {
					attachment.computeWorldVertices(
						slot,
						0,
						attachment.worldVerticesLength,
						vertices,
						0,
						2,
					);
				}
				if (!vertices.length) return;
				let left = Infinity,
					bottom = Infinity,
					right = -Infinity,
					top = -Infinity;
				for (let i = 0; i < vertices.length; i += 2) {
					left = Math.min(left, vertices[i]);
					right = Math.max(right, vertices[i]);
					bottom = Math.min(bottom, vertices[i + 1]);
					top = Math.max(top, vertices[i + 1]);
				}
				const renderer = player.sceneRenderer;
				const color = new spine.Color(1, 0.8, 0.2, 1);
				renderer.begin();
				renderer.line(left, bottom, right, bottom, color);
				renderer.line(right, bottom, right, top, color);
				renderer.line(right, top, left, top, color);
				renderer.line(left, top, left, bottom, color);
				renderer.end();
			},
		};
		config.backgroundColor =
			settings.value?.background.type === "color"
				? settings.value.background.color
				: "#00000000";
		if (assetsData.skeletonFilename.endsWith(".json")) {
			config.jsonUrl = assetsData.skeletonFilename;
		} else if (assetsData.skeletonFilename.endsWith(".skel")) {
			config.skelUrl = assetsData.skeletonFilename;
		} else {
			throw new Error(t("preview.unsupportedSkeleton"));
		}
		if (assetsData.rawData) {
			config.rawDataURIs = assetsData.rawData;
		}
		return config;
	}
	function initializePlayer(config: any, request: number) {
		if (!playerContainer.value) return;
		destroyPlayer();
		const onError = config.error;
		config.success = (player: SpinePlayer) => {
			if (request !== loadId) return;
			onPlayerSuccess(player);
			if (preview.value) preview.value.isLoading = false;
			if (source.value)
				addToHistory(
					{ ...source.value },
					undefined,
					undefined,
					title.value,
				);
		};
		config.error = (player: SpinePlayer, message: string) => {
			if (request !== loadId) return;
			if (onError) onError(player, message);
			else showError(message, request);
		};
		config.update = (player: SpinePlayer, delta: number) => {
			if (request === loadId) {
				datingInteraction.update(delta);
				if (!paused.value) minigame.update(delta);
				onPlayerUpdate(player, delta);
			}
		};
		playerContainer.value.innerHTML = "";
		spinePlayer = new spine.SpinePlayer(playerContainer.value, config);
	}
	function onPlayerSuccess(player: SpinePlayer) {
		spinePlayer = player;
		const animations = player.skeleton.data.animations.map(
			(animation: any) => animation.name,
		);
		if (!preview.value) return;
		preview.value.allAnimations = animations;
		layers.value = player.skeleton.data.slots.map((slot: any) => slot.name);
		skins.value = player.skeleton.data.skins.map((skin: any) => skin.name);
		skin.value =
			player.skeleton.skin?.name ??
			player.skeleton.data.defaultSkin?.name ??
			"";
		const initialAnimation = source.value?.type === "url" ? source.value.initialAnimation : undefined;
		const animation = initialAnimation && animations.includes(initialAnimation) ? initialAnimation :
			(preview.value.settings.followGlobalAnimation &&
			animations.includes(previewerStore.globalAnimation)
				? previewerStore.globalAnimation
				: preview.value.settings.currentAnimation) ??
			animations[0] ??
			null;
		if (animation) {
			preview.value.settings.currentAnimation = animation;
			player.setAnimation(
				animation,
				preview.value.settings.loopAnimation,
			);
		}
		applyPose();
		setupCamera(player);
		minigame.load(player);
		datingInteraction.load(
			player,
			player.config.skelUrl ?? player.config.jsonUrl ?? "",
		);
		cutscene
			.load(player, player.config.skelUrl ?? player.config.jsonUrl ?? "")
			.catch((error) =>
				logMessage(`Cutscene could not be loaded: ${error}`, "error"),
			);
		if (paused.value) player.pause();
		else player.play();
	}
	function destroyPlayer() {
		cutscene.dispose();
		previousCamera = null;
		minigame.load(null);
		datingInteraction.load(null);
		activeSequence.value = null;
		cameraListeners?.abort();
		cameraListeners = null;
		camera = null;
		initialCamera = null;
		skins.value = [];
		skin.value = "";
		hiddenAttachments.clear();
		layers.value = [];
		highlightedLayer.value = "";
		hiddenLayers.value = [];
		spinePlayer?.dispose();
		spinePlayer = null;
		playbackTime.value = 0;
		duration.value = 0;
	}
	watch(
		() => previewerStore.controlChange,
		(change) => {
			if (!change || change.sourceId === id || preview.value?.syncGroup !== change.groupId) return;
			applyControl(change.control as PreviewControl);
		},
		{ flush: "sync" },
	);
	// Relative camera updates are applied locally, never re-broadcast.
	watch(
		() => previewerStore.cameraChange,
		(change) => {
			if (!change || !camera || !spinePlayer || change.sourceId === id)
				return;
			if (
				!preview.value?.syncGroup ||
				preview.value.syncGroup !== change.groupId
			)
				return;
			const width = spinePlayer.canvas.clientWidth;
			const height = spinePlayer.canvas.clientHeight;
			if (!width || !height) return;
			const oldZoom = camera.zoom;
			const zoom = Math.min(
				defaultZoom * 100,
				Math.max(defaultZoom * 0.001, oldZoom * change.zoomRatio),
			);
			camera.x += width * change.anchorX * (oldZoom - zoom);
			camera.y += height * change.anchorY * (oldZoom - zoom);
			camera.zoom = zoom;
			camera.x -= change.dx * width * zoom;
			camera.y += change.dy * height * zoom;
		},
		{ flush: "sync" },
	);
	watch(
		sequenceKey,
		(key) => {
			if (key && !previewerStore.savedSequences[key])
				previewerStore.savedSequences[key] = [];
		},
		{ immediate: true, flush: "sync" },
	);
	watch(
		() => sequences.value.slice(),
		(values) => {
			if (activeSequence.value && !values.includes(activeSequence.value))
				stopSequence();
		},
	);
	watch(minigame.enabled, (value) => {
		if (!value || !settings.value) return;
		stopSequence();
		stopGameCutscene();
		datingInteraction.enabled.value = false;
		settings.value.followGlobalAnimation = false;
		settings.value.paused = false;
		minigame.reset();
	});
	watch(skin, (name) => {
		if (!spinePlayer || !skins.value.includes(name)) return;
		spinePlayer.skeleton.setSkinByName(name);
		if (activeSequence.value) applySequence(playbackTime.value);
		else applyPose();
	});
	watch(() => previewerStore.restartCount, restart);
	watch(currentAnimation, (animation) => {
		stopGameCutscene();
		if (
			datingInteraction.enabled.value || minigame.enabled.value
			// && spinePlayer?.animationState.getCurrent(0)?.animation.name === animation
		) {
			return;
		}
		datingInteraction.reset();
		stopSequence();
		if (
			spinePlayer &&
			animation &&
			allAnimations.value.includes(animation)
		) {
			// switch immediately, without keeping the previous animation's pose
			spinePlayer.animationState.clearTrack(0);
			spinePlayer.setAnimation(
				animation,
				settings.value?.loopAnimation ?? true,
			);
			applyPose();
		}
	});
	watch(paused, (paused) => {
		if (paused) spinePlayer?.pause();
		else spinePlayer?.play();
	});
	watch(
		() => settings.value?.loopAnimation,
		(loop) => {
			spinePlayer?.animationState.tracks.forEach((track: any) => {
				if (track && !datingInteraction.enabled.value && !minigame.enabled.value)
					track.loop = loop;
			});
		},
	);
	watch(
		() => settings.value?.background,
		(background) => {
			if (background)
				spinePlayer?.bg.setFromString(
					background.type === "color"
						? background.color
						: "#00000000",
				);
		},
		{ deep: true },
	);
	watch(
		() => settings.value?.premultipliedAlpha,
		(value) => {
			if (spinePlayer) spinePlayer.config.premultipliedAlpha = value;
		},
	);
	watch(
		[source, playerContainer, retryCount],
		async ([source, container], _previous, onCleanup) => {
			const request = ++loadId;
			onCleanup(() => {
				loadId++;
			});
			destroyPlayer();
			error.value = "";
			if (preview.value) {
				preview.value.allAnimations = [];
				preview.value.settings.currentAnimation = null;
				preview.value.isLoading = !!source && !!container;
			}
			if (!source || !container) return;
			try {
				if (source.type === "folder") {
					await loadSpineFromFolder(source.path, request);
				} else {
					loadSpineFromUrl(
						source.skeletonUrl,
						source.atlasUrl,
						request,
						source.skeletonUrlFallback,
						source.atlasUrlFallback,
					);
				}
			} catch (error) {
				showError(error, request);
			}
		},
		{
			immediate: true,
			flush: "post",
		},
	);
	onUnmounted(destroyPlayer);
	return {
		error,
		isLoading,
		retry: () => retryCount.value++,
		cutsceneAvailable: cutscene.available,
		cutsceneActive: cutscene.active,
		cutsceneIncomplete: cutscene.incomplete,
		playGameCutscene: () => runControl({ type: "cutscene" }),
		minigameAvailable: minigame.available,
		minigameEnabled: minigame.enabled,
		minigameFever: minigame.fever,
		minigameFeverAvailable: minigame.feverAvailable,
		datingMarkers: datingInteraction.markers,
		datingGroups: datingInteraction.groups,
		datingGroup: datingInteraction.group,
		selectDatingGroup: datingInteraction.selectGroup,
		datingTools: datingInteraction.tools,
		datingTool: datingInteraction.tool,
		selectDatingTool: datingInteraction.selectTool,
		datingGauge: datingInteraction.gauge,
		datingGaugeRange: datingInteraction.gaugeRange,
		isDating: datingInteraction.isDating,
		datingAvailable: datingInteraction.available,
		datingEnabled: datingInteraction.enabled,
		showDatingPoints: datingInteraction.showPoints,
		showDatingAreas: datingInteraction.showAreas,
		sequences,
		activeSequence,
		playSequence: (sequence: AnimationSequence) => runControl({ type: "sequence", sequence }),
		stopSequence: () => runControl({ type: "stopSequence" }),
		title,
		source,
		settings,
		currentAnimation,
		allAnimations,
		paused,
		loopAnimation,
		animationSelection,
		playbackTime,
		duration,
		seek: (event: Event) => runControl({ type: "seek", time: Number((event.target as HTMLInputElement).value) }),
		restart: () => runControl({ type: "restart" }),
		resetCamera: () => runControl({ type: "resetCamera" }),
		fitCharacter: () => runControl({ type: "fit" }),
		centerCharacter: () => runControl({ type: "center" }),
		skins,
		skin,
		layers,
		highlightedLayer,
		hiddenLayers,
	};
}

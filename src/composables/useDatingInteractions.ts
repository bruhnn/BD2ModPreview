import { describeLoadError, loadIssue, type LoadFailure, type LoadIssue } from "./previewErrors";
import { computed, ref, shallowRef, watch } from "vue";
import { useTimeoutFn } from "@vueuse/core";
import type { SpinePlayer } from "../types/spine";
import { DatingPoint, DatingScene, DatingGroup } from "../types/dating";
import { useDatingScenesStore } from "../stores/datingScenes";
import { useUIStore } from "../stores/ui";

import { useDatingAudio } from "./useDatingAudio";

declare const spine: any;

export function useDatingInteractions(
	onAnimation: (animation: string) => void = () => {},
	onSkeleton: (player: SpinePlayer) => void = () => {},
	onError: (message: string) => void = () => {},
) {
	const datingScenesStore = useDatingScenesStore();
	const uiStore = useUIStore();
	const audio = useDatingAudio();
	const poseLoadFailed = ref(false);
	const poseError = shallowRef<{ issue: LoadIssue; pose: number; attempt: number } | null>(null);
	let poseResults: LoadFailure[] = [];
	let poseAttempt = 0;
	const { start: dismissPoseError } = useTimeoutFn(() => {
		poseLoadFailed.value = false;
	}, 6000, { immediate: false });

	let currentDating: DatingScene | null = null;

	const group = shallowRef<DatingScene["groups"][number] | null>(null);

	const groups = computed(() => group.value ? currentDating?.groups ?? [] : []);
	const tools = computed(() => group.value?.tools ?? []);
	const tool = ref(0);

	const gauge = ref(0);
	const gaugeRange = computed(() =>
		group.value?.gauge.IsOn ? group.value.gauge.MinMaxScore : null,
	);

	let elapsed = 0;
	let hold: {
		point: DatingPoint;
		id: number;
		start: number;
		loopStarted: boolean;
		destination: number;
	} | null = null;
	const hidden = new Map<string, number>();
	const lastClick = new Map<string, number>();
	const dragPositions = new Map<string, { x: number; y: number }>();
	const available = ref(false);
	const isDating = ref(false);
	let skeletonFilename = "";
	const enabled = ref(false);
	const showPoints = ref(false);
	const showAreas = ref(false);
	const markers = shallowRef<{
		key: string; x: number; y: number; screenX: number; screenY: number; drag: boolean; pressed: boolean;
		dragging: boolean; hovered: boolean; dx: number; dy: number; pop: number;
		ripples: number[]; box: { width: string; height: string; transform: string };
	}[]>([]);
	let markerPress: {
		key: string; id: number; drag: boolean; down: boolean; releasedAt: number;
		startX: number; startY: number; x: number; y: number;
	} | null = null;
	const ripples = new Map<string, number[]>();
	let player: SpinePlayer | null = null;
	let reaction: any = null;
	let drag: {
		point: DatingPoint;
		id: number;
		startX: number;
		startY: number;
		x: number;
		y: number;
		started: boolean;
	} | null = null;
	let transition: any = null;
	let generation = 0;
	let switching = false;
	const skeletons = new Map<string, { skeleton: any; state: any }>();
	const assetManagers: any[] = [];
	let pointer: PointerEvent | null = null;
	let previousPoint = "";
	const clicks = new Map<string, number>();

	function reset() {
		audio.stop();
		if (dragPositions.size && player) {
			dragPositions.clear();
			player.skeleton.setToSetupPose();
			player.animationState.apply(player.skeleton);
			player.skeleton.updateWorldTransform();
		}
		markers.value = [];
		pointer = null;
		markerPress = null;
		ripples.clear();
		if (player) player.canvas.style.cursor = "";
		generation++;
		switching = false;
		cancelHold();
		hidden.clear();
		lastClick.clear();
		cancelDrag();
		if (transition && player) {
			transition.listener = null;
			const next = transition.next?.animation.name;
			transition = null;
			if (next) {
				player.animationState.setAnimation(0, next, true);
				onAnimation(next);
			}
		}
		previousPoint = "";
		clicks.clear();
		if (
			player &&
			reaction &&
			player.animationState.getCurrent(1) === reaction
		) {
			player.animationState.clearTrack(1);
			player.skeleton.setToSetupPose();
			player.animationState.apply(player.skeleton);
			player.skeleton.updateWorldTransform();
		}
		reaction = null;
	}

	function selectGroup(id: number) {
		const next = currentDating?.groups.find((entry) => entry.id === id);
		if (!enabled.value || !next || next === group.value) return;
		reset();
		elapsed = 0;
		return startGroup(next, "", true);
	}

	function restart() {
		reset();
		if (!enabled.value || !player || !currentDating?.groups.length) return;
		elapsed = 0;
		return startGroup(currentDating.groups[0], "", true);
	}

	watch(
		enabled,
		(value) => {
			reset();
			if (!value || !player || !currentDating?.groups.length) return;
			elapsed = 0;
			startGroup(currentDating.groups[0], "", true);
		},
		{ flush: "sync" },
	);

	watch(
		[isDating, () => uiStore.isSupporter],
		([dating, supporter]) => {
			if (dating && supporter) {
				datingScenesStore.load().catch(error => onError(`Failed to load dating interactions: ${error}`));
			} else if (!supporter) {
				enabled.value = false;
			}
		},
	);
	watch(
		[() => datingScenesStore.scenes, () => uiStore.isSupporter],
		() => load(player, skeletonFilename),
	);

	function load(value: SpinePlayer | null, filename = "") {
		enabled.value = false;
		reset();

		if (player !== value) {
			for (const manager of assetManagers) manager.dispose();
			assetManagers.length = 0;
			skeletons.clear();
		}
		player = value;
		if (player && !skeletons.size)
			skeletons.set(
				filename
					.split(/[\\/]/)
					.pop()!
					.replace(/\.(skel|json).*$/i, ""),
				{
					skeleton: player.skeleton,
					state: player.animationState,
				},
			);
		skeletonFilename = filename;
		showPoints.value = false;
		showAreas.value = false;

		const name = filename
			.match(
				/(?:^|[/\\])(illust_dating\d+)(?:_\d+)?\.(?:skel|json)(?:[?#]|$)/i,
			)?.[1]
			.toLowerCase();

		const scene = name ? (datingScenesStore.scenes[name] ?? null) : null;

		currentDating = scene;

		audio.load(uiStore.isSupporter ? scene?.audio : undefined);
		isDating.value = !!player && !!name;

		group.value = null;
		tool.value = 0;
		elapsed = 0;

		available.value = !!player && !!scene && uiStore.isSupporter;
	}

	function points() {
		if (!enabled.value || !player) return [];

		refreshGroup();

		if (!group.value) return [];

		const exclusive = currentDating?.points.find(
			(p) =>
				p.hidden.exclusive &&
				p.hidden.points.some((key) => hidden.has(key)),
		);

		return currentDating?.points.filter(
			(point) =>
				point.group === group.value!.id &&
				point.tool === tool.value &&
				(!exclusive || exclusive.hidden.points.includes(point.key)) &&
				(!currentDating?.points.some((p) =>
					p.hidden.points.includes(point.key),
				) ||
					hidden.has(point.key)) &&
				(!point.gauge.IsOn ||
					(Math.round(gauge.value) >=
						point.gauge.InteractableMinMaxRange.x &&
						Math.round(gauge.value) <=
							point.gauge.InteractableMinMaxRange.y)) &&
				player!.skeleton.findBone(point.bone)?.active,
		);
	}

	function refreshGroup() {
		if (!player) return;

		const animation = player.animationState.getCurrent(0)?.animation.name;
		const next = currentDating?.groups.find(
			(g) => g.animation === animation,
		);

		if (!next || group.value === next) return;

		if (dragPositions.size) {
			dragPositions.clear();
			player.skeleton.setToSetupPose();
			player.animationState.apply(player.skeleton);
			player.skeleton.updateWorldTransform();
		}

		hidden.clear();
		clicks.clear();

		group.value = next;
		gauge.value = next.gauge.StartScore;
		if (!next.keepTool || !next.tools.some((t) => t.id === tool.value)) {
			tool.value = next.tools[0]?.id ?? 0;
		}

		applyTool();
	}

	function applyTool() {
		const skin = tools.value.find((t) => t.id === tool.value)?.skin;

		if (skin && player?.skeleton.data.findSkin(skin)) {
			player.skeleton.setSkinByName(skin);
			player.skeleton.setSlotsToSetupPose();
		}
	}

	function selectTool(value: number) {
		if (!tools.value.some((t) => t.id === value)) return;

		reset();
		tool.value = value;
		applyTool();
	}

	function addScore(value: number) {
		const config = group.value?.gauge;

		if (!config?.IsOn) return;

		const previous = Math.round(gauge.value);

		gauge.value = Math.max(
			config.MinMaxScore.x,
			Math.min(config.MinMaxScore.y, gauge.value + value),
		);

		const current = Math.round(gauge.value);

		const motions =
			current > previous
				? [...config.MotionNameByScoreList].reverse()
				: config.MotionNameByScoreList;

		const motion = motions.find((m) =>
			current > previous
				? m.IsCanPlayWhenIncreaseScore &&
					previous < m.Score &&
					m.Score <= current
				: m.IsCanPlayWhenDecreaseScore &&
					current <= m.Score &&
					m.Score < previous,
		);

		if (motion?.MixAnimationName) {
			playReaction(motion.MixAnimationName);
			void audio.playEvents([
				motion.VoiceSoundEventName ? `event:/Voices/${motion.VoiceSoundEventName}_KR` : undefined,
				motion.SFXSoundEventName,
			]);
		}
	}

	function reveal(point: DatingPoint) {
		const duration = reaction?.animation.duration ?? 0;

		for (const key of point.hidden.points)
			hidden.set(key, elapsed + duration + point.hidden.duration);

		const parent = currentDating?.points.find((p) =>
			p.hidden.points.includes(point.key),
		);

		if (parent) {
			for (const key of parent.hidden.points) {
				hidden.set(
					key,
					elapsed +
						duration +
						(point.hidden.closeParent ? 0 : parent.hidden.duration),
				);
			}
		}
	}

	function cancelHold(release = true) {
		const current = hold;
		hold = null;
		if (current) audio.stop();

		if (current && player) {
			const parent = currentDating?.points.find((p) =>
				p.hidden.points.includes(current.point.key),
			);

			if (parent) {
				for (const key of parent.hidden.points) {
					if (hidden.get(key) === Infinity)
						hidden.set(key, elapsed + parent.hidden.duration);
				}
			}

			player.animationState.clearTrack(2);

			if (release && player.canvas.hasPointerCapture(current.id)) {
				player.canvas.releasePointerCapture(current.id);
			}
		}
	}

	function finishHold(success: boolean) {
		if (!hold || !player) return;

		const point = hold.point;
		const destination = hold.destination;

		cancelHold();
		cancelDrag();

		if (success && point.nextGroup) {
			changeGroup(point, destination);
		} else {
			const animation = (success ? point.hold.success : point.hold.fail)[
				destination
			];

			if (animation) {
				playReaction(animation);
				audio.play(point, success ? "success" : "fail", destination);
			}

			if (point.gauge.IsOn)
				addScore(
					success
						? point.gauge.LongPressSuccessScore
						: point.gauge.LongPressFailScore,
				);

			reveal(point);
		}
	}

	function position(event: PointerEvent) {
		const rect = player!.canvas.getBoundingClientRect();

		return player!.sceneRenderer.camera.screenToWorld(
			new spine.Vector3(
				((event.clientX - rect.left) * player!.canvas.width) /
					rect.width,
				((event.clientY - rect.top) * player!.canvas.height) /
					rect.height,
				0,
			),
			player!.canvas.width,
			player!.canvas.height,
		);
	}

	function contains(corners: number[][], x: number, y: number) {
		let positive = false;
		let negative = false;

		for (let i = 0; i < corners.length; i++) {
			const a = corners[i],
				b = corners[(i + 1) % corners.length];
			const cross =
				(b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);

			positive ||= cross > 0;
			negative ||= cross < 0;
		}

		return !(positive && negative);
	}

	function playReaction(animation: string) {
		if (!player?.skeleton.data.findAnimation(animation)) return;

		const state = player!.animationState;

		state.clearTrack(1);
		player!.skeleton.setToSetupPose();
		reaction = state.setAnimation(1, animation, false);
		reaction.mixDuration = 0;
		state.apply(player!.skeleton);
		player!.skeleton.updateWorldTransform();
	}

	function pointerDown(event: PointerEvent) {
		if (!player || !enabled.value || event.button !== 0) return false;
		if (drag || hold || transition || switching) return true;

		const world = position(event);
		// Visible markers can be grabbed even when the game area is tiny.
		const selectedMarker = showPoints.value ? markers.value.find(marker =>
			Math.hypot(event.clientX - marker.screenX, event.clientY - marker.screenY) <= (marker.drag ? 22 : 14),
		) : null;

		for (const point of points() ?? []) {
			const bone = player.skeleton.findBone(point.bone);
			const local = bone.worldToLocal({ x: world.x, y: world.y });

			if (selectedMarker ? point.key !== selectedMarker.key : !contains(point.corners, local.x, local.y)) continue;

			pointer = event;
			const marker = markers.value.find((entry) => entry.key === point.key);
			markerPress = {
				key: point.key, id: event.pointerId, drag: point.drag, down: true, releasedAt: 0,
				startX: event.clientX, startY: event.clientY, x: marker?.x ?? 0, y: marker?.y ?? 0,
			};
			if (!point.drag) ripples.set(point.key, [...(ripples.get(point.key) ?? []), performance.now()]);
			player.canvas.setPointerCapture(event.pointerId);
			const key = point.key;

			// changing areas reset the previous areas click count

			if (previousPoint !== key) {
				clicks.delete(previousPoint);
			}

			previousPoint = key;

			if (point.drag) {
				drag = {
					point,
					id: event.pointerId,
					startX: event.clientX,
					startY: event.clientY,
					x: bone.x,
					y: bone.y,
					started: false,
				};

				player.canvas.setPointerCapture(event.pointerId);
			} else {
				if (
					point.clickMax > 1 &&
					elapsed - (lastClick.get(key) ?? 0) > point.clickReset
				) {
					clicks.delete(key);
				}

				const count = clicks.get(key) ?? 0;

				lastClick.set(key, elapsed);

				const index = point.random
					? Math.floor(Math.random() * point.animations.length)
					: Math.min(count, point.animations.length - 1);

				clicks.set(key, count + 1);

				if (
					point.nextGroup &&
					!point.hold.mode &&
					count + 1 >= point.clickMax
				) {
					changeGroup(point);
				} else {
					playReaction(point.animations[index]);
					audio.play(point, "click", index);
				}

				if (point.gauge.IsOn && point.gauge.Scores.length) {
					addScore(
						point.gauge.Scores[
							Math.min(count, point.gauge.Scores.length - 1)
						],
					);
				}

				reveal(point);

				if (point.hold.mode) {
					hold = {
						point,
						id: event.pointerId,
						start: elapsed,
						loopStarted: false,
						destination: 0,
					};

					const parent = currentDating?.points.find((p) =>
						p.hidden.points.includes(point.key),
					);

					if (parent) {
						for (const key of parent.hidden.points) {
							hidden.set(key, Infinity);
						}
					}

					player.canvas.setPointerCapture(event.pointerId);
				}
			}

			event.preventDefault();
			return true;
		}
		return false;
	}

	function pointerLeave() {
		if (!markerPress?.down) pointer = null;
	}

	function pointerMove(event: PointerEvent) {
		pointer = event;
		if (!player || !drag || drag.id !== event.pointerId) return false;
		if (!drag.started) {
			if (
				Math.hypot(
					event.clientX - drag.startX,
					event.clientY - drag.startY,
				) < 5
			)
				return true;
			drag.started = true;
			playReaction(drag.point.animations[0]);
			audio.play(drag.point, "click", 0);
		}
		const bone = player.skeleton.findBone(drag.point.bone);
		const world = position(event);
		if (drag.point.zone) {
			const zone = drag.point.zone;
			const parent = player.skeleton.findBone(zone.bone);
			const local = parent.worldToLocal({ x: world.x, y: world.y });
			const a = zone.corners[0],
				b = zone.corners[3],
				c = zone.corners[1];
			const ux = b[0] - a[0],
				uy = b[1] - a[1],
				vx = c[0] - a[0],
				vy = c[1] - a[1];
			const det = ux * vy - uy * vx;
			const u = Math.max(
				0,
				Math.min(
					1,
					((local.x - a[0]) * vy - (local.y - a[1]) * vx) / det,
				),
			);
			const v = Math.max(
				0,
				Math.min(
					1,
					((local.y - a[1]) * ux - (local.x - a[0]) * uy) / det,
				),
			);
			Object.assign(
				world,
				parent.localToWorld({
					x: a[0] + u * ux + v * vx,
					y: a[1] + u * uy + v * vy,
				}),
			);
		} else {
			const center = bone.parent.localToWorld({
				x: bone.data.x,
				y: bone.data.y,
			});
			const dx = world.x - center.x,
				dy = world.y - center.y;
			const distance = Math.hypot(dx, dy);
			if (distance > drag.point.radius) {
				world.x = center.x + (dx * drag.point.radius) / distance;
				world.y = center.y + (dy * drag.point.radius) / distance;
			}
		}
		const local = bone.parent.worldToLocal({ x: world.x, y: world.y });
		drag.x = local.x;
		drag.y = local.y;
		update();
		event.preventDefault();
		return true;
	}

	function cancelDrag() {
		const current = drag;
		drag = null;
		if (current && player?.canvas.hasPointerCapture(current.id))
			player.canvas.releasePointerCapture(current.id);
		if (current?.started && player) {
			player.skeleton.setToSetupPose();
			player.animationState.apply(player.skeleton);
			player.skeleton.updateWorldTransform();
		}
	}

	function releaseMarker(event: PointerEvent) {
		if (markerPress?.id === event.pointerId && markerPress.down) {
			markerPress.down = false;
			markerPress.releasedAt = performance.now();
		}
	}

	function pointerUp(event: PointerEvent) {
		releaseMarker(event);
		if (drag?.id === event.pointerId && drag.started && drag.point.resetOnRelease === false) {
			dragPositions.set(drag.point.bone, { x: drag.x, y: drag.y });
		}
		if (hold?.id === event.pointerId) {
			finishHold(elapsed - hold.start >= hold.point.hold.time);
			cancelDrag();
			return true;
		}
		if (!drag || drag.id !== event.pointerId) {
			if (player?.canvas.hasPointerCapture(event.pointerId)) player.canvas.releasePointerCapture(event.pointerId);
			return false;
		}
		const current = drag;
		cancelDrag();
		if (current.started) {
			playReaction(current.point.animations[1]);
			audio.play(current.point, "click", 1);
		}
		return true;
	}

	function update(delta = 0) {
		if (!player || !enabled.value) return;
		elapsed += delta;
		refreshGroup();
		for (const [key, until] of hidden)
			if (until <= elapsed) {
				hidden.delete(key);
				clicks.delete(key);
				const parent = currentDating?.points.find((p) =>
					p.hidden.points.includes(key),
				);
				if (parent?.hidden.reset) {
					dragPositions.clear();
					player.skeleton.setToSetupPose();
					player.animationState.apply(player.skeleton);
					player.skeleton.updateWorldTransform();
					cancelDrag();
					clicks.clear();
				}
				if (hold?.point.key === key) cancelHold();
				if (drag?.point.key === key) cancelDrag();
			}
		const config = group.value?.gauge;
		if (
			config?.IsOn &&
			gauge.value >= config.AutoDecreaseScoreMinMaxLimit.x &&
			gauge.value <= config.AutoDecreaseScoreMinMaxLimit.y
		) {
			const value = Math.max(
				config.AutoDecreaseScoreMinMaxLimit.x,
				Math.min(
					config.AutoDecreaseScoreMinMaxLimit.y,
					gauge.value + config.AutoDecreaseScorePerSecond * delta,
				),
			);
			addScore(value - gauge.value);
		}
		if (hold) {
			if (!hold.loopStarted && (!reaction || reaction.isComplete())) {
				const animation = hold.point.hold.loop[hold.destination];
				if (animation && player.skeleton.data.findAnimation(animation))
					player.animationState.setAnimation(2, animation, true);
				audio.play(hold.point, "loop", hold.destination);
				hold.loopStarted = true;
			}
			if (
				hold.point.hold.mode === 1 &&
				elapsed - hold.start >= hold.point.hold.time
			)
				finishHold(true);
		}
		for (const [name, position] of dragPositions) {
			const bone = player.skeleton.findBone(name);
			bone.x = position.x;
			bone.y = position.y;
		}
		if (dragPositions.size) player.skeleton.updateWorldTransform();
		if (!drag?.started) return;
		const bone = player.skeleton.findBone(drag.point.bone);
		bone.x = drag.x;
		bone.y = drag.y;
		player.skeleton.updateWorldTransform();
		const destinations = drag.point.destinations;
		if (!destinations.length) return;
		const collider = drag.point.collider.map(([x, y]) =>
			bone.localToWorld({ x, y }),
		);
		// The game checks collider overlap, not the mouse position.
		const destination = destinations.findIndex((region) => {
			if (!region) return false;
			const parent = player!.skeleton.findBone(region.bone);
			if (!parent) return false;
			const target = region.corners.map(([x, y]) =>
				parent.localToWorld({ x, y }),
			);
			for (const polygon of [target, collider]) {
				for (let i = 0; i < polygon.length; i++) {
					const a = polygon[i],
						b = polygon[(i + 1) % polygon.length];
					const x = a.y - b.y,
						y = b.x - a.x;
					const first = target.map((p) => p.x * x + p.y * y);
					const second = collider.map((p) => p.x * x + p.y * y);
					if (
						Math.max(...first) < Math.min(...second) ||
						Math.max(...second) < Math.min(...first)
					)
						return false;
				}
			}
			return true;
		});
		if (destination < 0) {
			if (hold?.point === drag.point) cancelHold(false);
			return;
		}
		const point = drag.point;
		if (point.hold.mode) {
			if (hold && hold.destination !== destination) cancelHold(false);
			if (!hold)
				hold = {
					point,
					id: drag.id,
					start: elapsed,
					loopStarted: false,
					destination,
				};
		} else changeGroup(point, destination);
	}

	async function loadGroupSkeleton(next: DatingGroup) {
		if (!player || !next.skeleton) return null;
		const cached = skeletons.get(next.skeleton);
		if (cached) return cached;
		const currentPlayer = player;
		const request = generation;
		const filename = player.config.skelUrl ?? player.config.jsonUrl;
		const raw = player.config.rawDataURIs;
		let skeletonUrl: string;
		let atlasUrl: string;
		if (raw) {
			skeletonUrl =
				[next.skeleton + ".skel", next.skeleton + ".json"].find(
					(name) => raw[name],
				) ?? "";
			atlasUrl = next.skeleton + ".atlas";
			if (!skeletonUrl || !raw[atlasUrl])
				throw new Error(
					`Missing dating assets: ${next.skeleton}.skel / .atlas`,
				);
		} else {
			// Each official part has its own folder.
			const url = new URL(filename);
			const parts = url.pathname.split("/");
			parts[parts.length - 2] = next.skeleton;
			parts[parts.length - 1] = next.skeleton + ".skel";
			url.pathname = parts.join("/");
			skeletonUrl = url.href;
			url.pathname = url.pathname.replace(/\.skel$/, ".atlas");
			atlasUrl = url.href;
		}
		while (true) {
			const manager = new spine.AssetManager(player.sceneRenderer.context);
			try {
				for (const [name, data] of Object.entries(raw ?? {}))
					manager.setRawDataURI(name, data);
				if (skeletonUrl.endsWith(".json")) manager.loadJson(skeletonUrl);
				else manager.loadBinary(skeletonUrl);
				manager.loadTextureAtlas(atlasUrl);
				await manager.loadAll();
				if (request !== generation || player !== currentPlayer) {
					manager.dispose();
					return null;
				}
				const loader = new spine.AtlasAttachmentLoader(
					manager.get(atlasUrl),
				);
				const reader = skeletonUrl.endsWith(".json")
					? new spine.SkeletonJson(loader)
					: new spine.SkeletonBinary(loader);
				const data = reader.readSkeletonData(manager.get(skeletonUrl));
				const skeleton = new spine.Skeleton(data);
				const stateData = new spine.AnimationStateData(data);
				stateData.defaultMix = player.config.defaultMix;
				const loaded = {
					skeleton,
					state: new spine.AnimationState(stateData),
				};
				skeletons.set(next.skeleton, loaded);
				assetManagers.push(manager);
				poseResults = [];
				return loaded;
			} catch (error) {
				manager.dispose();
				if (request !== generation || player !== currentPlayer) return null;
				const results = describeLoadError(error, raw ? "folder" : "online", skeletonUrl);
				poseResults.push(...results);
				onError(JSON.stringify({ results, skeletonUrl, atlasUrl, error }));
				const cdn = "https://cdn.jsdelivr.net/gh/bruhnn/Brown-Dust-2-Asset@master/";
				if (raw || !skeletonUrl.startsWith(cdn) || !atlasUrl.startsWith(cdn))
					throw error;
				// Retry the whole part, including atlas textures, from GitHub.
				const github = "https://raw.githubusercontent.com/bruhnn/Brown-Dust-2-Asset/refs/heads/master/";
				skeletonUrl = github + skeletonUrl.slice(cdn.length);
				atlasUrl = github + atlasUrl.slice(cdn.length);
			}
		}
	}

	function changeGroup(point: DatingPoint, destination = 0) {
		const next = currentDating?.groups.find(
			(g) => g.id === point.nextGroup,
		);
		if (next) return startGroup(next, point.motions[destination], false, () => audio.play(point, "motion", destination));
	}

	async function startGroup(next: DatingGroup, motion = "", initial = false, onMotion?: () => void) {
		if (!player || switching) return;
		const request = generation;
		const currentPlayer = player;
		poseLoadFailed.value = false;
		poseResults = [];
		switching = true;
		try {
			const loaded = await loadGroupSkeleton(next);
			if (request !== generation || player !== currentPlayer) return;
			const skeleton = loaded?.skeleton ?? player.skeleton;
			if (!skeleton.data.findAnimation(next.animation))
				throw new Error(`Missing dating animation: ${next.animation}`);
			if (
				!initial &&
				next.switchAnimation &&
				!skeleton.data.findAnimation(next.switchAnimation)
			)
				throw new Error(
					`Missing dating animation: ${next.switchAnimation}`,
				);
			dragPositions.clear();
			cancelDrag();
			cancelHold();
			clicks.clear();
			hidden.clear();
			player.animationState.clearTrack(1);
			reaction = null;
			const enterGroup = () => {
				if (request !== generation || player !== currentPlayer) return;
				if (loaded && player.skeleton !== loaded.skeleton) {
					loaded.skeleton.x = player.skeleton.x;
					loaded.skeleton.y = player.skeleton.y;
					loaded.skeleton.scaleX = player.skeleton.scaleX;
					loaded.skeleton.scaleY = player.skeleton.scaleY;
					player.skeleton = loaded.skeleton;
					player.animationState = loaded.state;
					onSkeleton(player);
				}
				player.animationState.clearTracks();
				player.skeleton.setToSetupPose();
				group.value = next;
				gauge.value = next.gauge.StartScore;
				if (
					initial ||
					!next.keepTool ||
					!next.tools.some((t) => t.id === tool.value)
				)
					tool.value = next.tools[0]?.id ?? 0;
				applyTool();
				if (!initial && next.switchAnimation) {
					transition = player.animationState.setAnimation(
						0,
						next.switchAnimation,
						false,
					);
					transition.mixDuration = 0;
					const idle = player.animationState.addAnimation(
						0,
						next.animation,
						true,
						0,
					);
					idle.mixDuration = 0;
					idle.listener = {
						start: () => {
							transition = null;
							onAnimation(next.animation);
						},
					};
					onAnimation(next.switchAnimation);
				} else {
					transition = null;
					player.animationState.setAnimation(0, next.animation, true);
					onAnimation(next.animation);
				}
				player.animationState.apply(player.skeleton);
				player.skeleton.updateWorldTransform();
				switching = false;
			};
			onMotion?.();
			if (motion && player.skeleton.data.findAnimation(motion)) {
				transition = player.animationState.setAnimation(
					0,
					motion,
					false,
				);
				transition.mixDuration = 0;
				// Switch after the player's current frame has finished.
				transition.listener = {
					complete: () => {
						queueMicrotask(enterGroup);
					},
				};
			} else enterGroup();
		} catch (error) {
			if (request !== generation) return;
			switching = false;
			const origin = player?.config.rawDataURIs ? "folder" : "online";
			if (!poseResults.length) poseResults.push(...describeLoadError(error, origin));
			poseError.value = { issue: loadIssue(origin, poseResults), pose: (currentDating?.groups.indexOf(next) ?? -1) + 1, attempt: ++poseAttempt };
			poseLoadFailed.value = true;
			dismissPoseError();
			onError(JSON.stringify({ ...poseError.value, error: error instanceof Error ? error.message : error }));
		}
	}

	function updateMarkers(origin: DOMRect) {
		if (!player || !enabled.value) {
			if (markers.value.length) markers.value = [];
			return;
		}
		const canvas = player.canvas.getBoundingClientRect();
		const world = pointer ? position(pointer) : null;
		const now = performance.now();
		let cursor = "";
		// Keep the active point visible while dragging or holding.
		const activePoint = drag?.point ?? hold?.point;
		const visiblePoints = activePoint ? [activePoint] : transition || switching ? [] : points() ?? [];
		markers.value = visiblePoints.map((point) => {
			const bone = player!.skeleton.findBone(point.bone);
			const local = world ? bone.worldToLocal({ x: world.x, y: world.y }) : null;
			const corners = point.corners.map(([x, y]) => {
				const world = bone.localToWorld({ x, y });
				const screen = player!.sceneRenderer.camera.worldToScreen(new spine.Vector3(world.x, world.y, 0), canvas.width, canvas.height);
				return { x: screen.x + canvas.left - origin.left, y: canvas.height - screen.y + canvas.top - origin.top };
			});
			const center = {
				x: corners.reduce((sum, corner) => sum + corner.x, 0) / corners.length,
				y: corners.reduce((sum, corner) => sum + corner.y, 0) / corners.length,
			};
			const screenX = center.x + origin.left;
			const screenY = center.y + origin.top;
			const hovered = !!local && (contains(point.corners, local.x, local.y) ||
				showPoints.value && !!pointer && Math.hypot(pointer.clientX - screenX, pointer.clientY - screenY) <= (point.drag ? 22 : 14));
			if (!cursor && hovered) cursor = point.drag ? "grab" : "pointer";
			const width = Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y);
			const height = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
			const press = markerPress?.key === point.key ? markerPress : null;
			const dragging = !!press?.drag && press.down;
			const pulses = (ripples.get(point.key) ?? []).filter((time) => now - time < 800);
			if (pulses.length) ripples.set(point.key, pulses);
			else ripples.delete(point.key);
			return {
				key: point.key, x: dragging ? press.x : center.x, y: dragging ? press.y : center.y, screenX, screenY,
				drag: point.drag, dragging, hovered,
				pressed: !point.drag && !!press && (press.down || now - press.releasedAt < 200),
				dx: dragging && pointer ? pointer.clientX - press.startX : 0,
				dy: dragging && pointer ? pointer.clientY - press.startY : 0,
				pop: pulses.length && now - pulses[pulses.length - 1] < 400 ? pulses[pulses.length - 1] : 0,
				ripples: pulses,
				box: {
					width: `${width}px`, height: `${height}px`,
					transform: `matrix(${(corners[3].x - corners[0].x) / (width || 1)}, ${(corners[3].y - corners[0].y) / (width || 1)}, ${(corners[1].x - corners[0].x) / (height || 1)}, ${(corners[1].y - corners[0].y) / (height || 1)}, ${corners[0].x}, ${corners[0].y})`,
				},
			};
		});
		player.canvas.style.cursor = markerPress?.drag && markerPress.down ? "grabbing" : cursor;
	}

	return {
		poseLoadFailed,
		poseError,
		audioProgress: audio.audioProgress,
		groups,
		group,
		selectGroup,
		isDating,
		available,
		enabled,
		showPoints,
		showAreas,
		tools,
		tool,
		gauge,
		gaugeRange,
		selectTool,
		cancelHold,
		load,
		reset,
		restart,
		pointerDown,
		pointerMove,
		pointerLeave,
		pointerUp,
		releaseMarker,
		cancelDrag,
		update,
		markers,
		updateMarkers,
	};
}

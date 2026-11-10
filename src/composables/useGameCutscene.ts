import { computed, ref } from "vue";
import { useLogger } from "./useLogger";
import type { SpinePlayer } from "../types/spine";
import { loadCutscene } from "../utils/cutsceneData";
import { useGameBackgroundStore } from "../stores/gameBackgrounds";
import type { GameBackgroundInfo } from "../types/background";

export type Scene = {
	revision: number;
	duration: number;
	nodes: {
		path: string;
		parent: number;
		active: boolean;
		position: { x: number; y: number };
		scale: { x: number; y: number; z: number };
		size: { x: number; y: number };
		pivot: { x: number; y: number };
		anchorMin: { x: number; y: number };
		anchorMax: { x: number; y: number };
		color: { r: number; g: number; b: number; a: number };
		texture: string | null;
		blend?: "additive" | "multiply";
		// Background graphics (game background only): a flat colored rect, component on/off, texture rect.
		solid?: boolean;
		enabled?: boolean;
		uvRect?: { x: number; y: number; width: number; height: number };
		skeleton: boolean;
		groupAlpha?: number;
		ignoreParentGroups?: boolean;
		asset?: string;
		rotation?: number;
		depth?: number;
		quaternion?: { x: number; y: number; z: number; w: number };
		euler?: { x: number; y: number; z: number };
		defaultMix?: number;
		mixes?: { fromName: string; toName: string; duration: number }[];
	}[];
	tracks: {
		node: number;
		trackIndex?: number;
		clips: {
			name: string;
			start: number;
			duration: number;
			clipIn: number;
			speed: number;
			loop?: boolean;
			settings?: {
				customDuration: number;
				useBlendDuration: number;
				mixDuration: number;
				holdPrevious: number;
				alpha: number;
				attachmentThreshold: number;
				drawOrderThreshold: number;
				eventThreshold: number;
				dontEndWithClip: number;
				endMixOutDuration: number;
			};
			blendIn?: number;
			easeIn?: number;
		}[];
	}[];
	curves: Curve[];
	assets?: Record<string, { scale: number }>;
	activations?: {
		node: number;
		clips: { start: number; duration: number }[];
	}[];
	textures?: Record<
		string,
		{ width: number; height: number; bytes: number; repeat?: boolean }
	>;
	// Layers recorded from the game itself (see scripts/import_cutscene_dump.py). When present they replace the
	// layers derived from the Timeline. Each key is [time] (hidden) or [time, ...18 values] (visible):
	// a b c d tx ty | r g b a | rect x y w h | uv x y w h.
	baked?: {
		canvas: { w: number; h: number };
		duration: number;
		elements: {
			path: string;
			order: number;
			sort: number;
			texture?: string;
			solid?: boolean;
			blend?: "additive" | "multiply";
			keys: number[][];
		}[];
		// Character nodes: draw order plus, when recorded, their placement keys (same layout as the layer keys).
		skeletons: Record<
			string,
			{ order: number; sort: number; keys?: number[][] }
		>;
	};
};

declare const spine: any;

type Curve = {
	start?: number;
	end?: number;
	clipIn?: number;
	speed?: number;
	path: string | null;
	property: string;
	constant?: number;
	keys: { time: number; value: number; coefficients: number[] }[];
};

export function useGameCutscene(
	backgroundEnabled: () => boolean = () => false,
) {
	const { logMessage } = useLogger();
	const backgroundStore = useGameBackgroundStore();
	const incomplete = ref(false);
	const backgroundImages = ref<
		{
			hash: string;
			name: string;
			width: number;
			height: number;
			bytes: number;
		}[]
	>([]);
	const backgroundInfo = computed<GameBackgroundInfo | null>(() =>
		backgroundImages.value.length
			? {
					count: backgroundImages.value.length,
					bytes: backgroundImages.value.reduce(
						(sum, image) => sum + image.bytes,
						0,
					),
				}
			: null,
	);
	const layerTextures = new Map<string, any>();
	// Multiply layers need premultiplied data (see drawLayer), uploaded as a second copy on first use.
	const layerImages = new Map<string, HTMLImageElement>();
	const premultipliedTextures = new Map<string, any>();
	let texturesRequested = false;
	let texturesPending = 0;
	const cutsceneId = ref("");
	let scene: Scene | null = null;
	let end = 0;
	const available = ref(false);
	const active = ref(false);
	let player: SpinePlayer | null = null;
	let skeletons = new Map<number, any>();
	let states = new Map<number, any>();
	let entries: any[] = [];
	let events: {
		time: number;
		start: boolean;
		track: number;
		clip: Scene["tracks"][number]["clips"][number];
	}[] = [];
	let eventIndex = 0;
	let animationTime = -1;
	let assetManagers: any[] = [];
	let generation = 0;
	let time = 0;

	function dispose() {
		generation++;
		scene = null;
		available.value = false;
		incomplete.value = false;
		backgroundImages.value = [];
		for (const texture of layerTextures.values()) texture.dispose();
		layerTextures.clear();
		for (const texture of premultipliedTextures.values()) texture.dispose();
		premultipliedTextures.clear();
		layerImages.clear();
		whiteTexture?.dispose();
		whiteTexture = null;
		texturesRequested = false;
		texturesPending = 0;
		cutsceneId.value = "";
		active.value = false;
		for (const manager of assetManagers) manager.dispose();
		assetManagers = [];
		skeletons.clear();
		states.clear();
		entries = [];
		events = [];
		animationTime = -1;
		player = null;
		time = 0;
	}

	function imagesOf(timeline: Scene) {
		const names = new Map<string, string>();
		const layerName = (path: string) =>
			path.split("/").pop()?.trim() || path;
		for (const node of timeline.nodes)
			if (node.texture && !names.has(node.texture))
				names.set(node.texture, layerName(node.path));
		for (const element of timeline.baked?.elements ?? [])
			if (element.texture && !names.has(element.texture))
				names.set(element.texture, layerName(element.path));
		return Object.entries(timeline.textures ?? {})
			.map(([hash, size]) => ({
				hash,
				name: names.get(hash) ?? hash.slice(0, 8),
				width: size.width,
				height: size.height,
				bytes: size.bytes,
			}))
			.sort((a, b) => b.width * b.height - a.width * a.height);
	}

	async function load(value: SpinePlayer, filename: string) {
		dispose();
		const id = filename.match(
			/(?:^|[/\\])cutscene_char(\d+)(?:_[a-z])?\.(?:skel|json)(?:[?#]|$)/i,
		)?.[1];
		if (!id) return;
		const request = generation;
		const timeline = await loadCutscene(id);
		if (request !== generation || !timeline) return;
		const data = new Map<string, any>([["", value.skeleton.data]]);
		const managers: any[] = [];
		for (const [key, asset] of Object.entries(timeline.assets ?? {})) {
			const base = `${import.meta.env.BASE_URL}cutscene-assets/${id}/${key}/`;
			const manager = new spine.AssetManager(value.sceneRenderer.context);
			try {
				manager.loadBinary(base + "skeleton.skel");
				manager.loadTextureAtlas(base + "skeleton.atlas");
				await manager.loadAll();
				const reader = new spine.SkeletonBinary(
					new spine.AtlasAttachmentLoader(
						manager.get(base + "skeleton.atlas"),
					),
				);
				reader.scale = asset.scale;
				data.set(
					key,
					reader.readSkeletonData(
						manager.get(base + "skeleton.skel"),
					),
				);
				managers.push(manager);
			} catch (error) {
				manager.dispose();
				if (request === generation) {
					logMessage(
						`Cutscene ${id}: skipping skeleton ${key}: ${error}`,
						"warning",
					);
				}
			}
			if (request !== generation) {
				for (const manager of managers) manager.dispose();
				return;
			}
		}
		const tracks = timeline.tracks.filter((track) =>
			data.has(timeline.nodes[track.node].asset ?? ""),
		);
		if (
			!tracks.length ||
			!tracks.every((track) =>
				track.clips.every((clip) =>
					data
						.get(timeline.nodes[track.node].asset ?? "")
						.findAnimation(clip.name),
				),
			)
		) {
			for (const manager of managers) manager.dispose();
			return;
		}
		incomplete.value = tracks.length !== timeline.tracks.length;
		scene = { ...timeline, tracks };
		end = playbackEnd(scene);
		assetManagers = managers;
		player = value;
		for (const track of scene.tracks) {
			if (skeletons.has(track.node)) continue;
			const skeleton = new spine.Skeleton(
				data.get(scene.nodes[track.node].asset ?? ""),
			);
			if (!scene.nodes[track.node].asset && value.skeleton.skin)
				skeleton.setSkin(value.skeleton.skin);
			skeletons.set(track.node, skeleton);
		}
		events = scene.tracks
			.flatMap((track, index) =>
				track.clips.flatMap((clip) => [
					{ time: clip.start, start: true, track: index, clip },
					{
						time: clip.start + clip.duration,
						start: false,
						track: index,
						clip,
					},
				]),
			)
			.sort(
				(a, b) =>
					a.time - b.time ||
					Number(b.start) - Number(a.start) ||
					a.track - b.track ||
					a.clip.duration - b.clip.duration,
			);
		backgroundImages.value = imagesOf(timeline);
		cutsceneId.value = id;
		available.value = true;
	}

	// Stop where the closing fade begins: in the game the next scene follows it.
	function playbackEnd(timeline: Scene) {
		const tiny = (hash?: string | null) => {
			const info = hash ? timeline.textures?.[hash] : undefined;
			return !!info && info.width <= 64 && info.height <= 64;
		};
		let result = timeline.duration;
		const fadeFrom = (time: number) => {
			if (time > timeline.duration - 3 && time < result) result = time;
		};
		for (const element of timeline.baked?.elements ?? []) {
			const last = element.keys[element.keys.length - 1];
			if (
				!(element.solid || tiny(element.texture)) ||
				last.length === 1 ||
				last[10] < 0.5
			)
				continue;
			if (
				Math.min(
					Math.hypot(last[1], last[2]) * last[13],
					Math.hypot(last[3], last[4]) * last[14],
				) < 1500
			)
				continue;
			for (let i = element.keys.length - 1; i >= 0; i--)
				if (
					element.keys[i].length === 1 ||
					element.keys[i][10] <= 0.05
				) {
					fadeFrom(element.keys[i][0]);
					break;
				}
		}
		if (timeline.baked) return result;
		for (const node of timeline.nodes) {
			if (!(node.solid || tiny(node.texture))) continue;
			if (
				Math.min(
					node.size.x * Math.abs(node.scale.x),
					node.size.y * Math.abs(node.scale.y),
				) < 1500
			)
				continue;
			for (const curve of timeline.curves as Curve[]) {
				const keys = curve.keys;
				if (
					curve.path !== node.path ||
					curve.property !== "m_Color.a" ||
					!keys.length
				)
					continue;
				if (keys[keys.length - 1].value < 0.5) continue;
				for (let i = keys.length - 1; i >= 0; i--)
					if (keys[i].value <= 0.05) {
						fadeFrom(
							(keys[i].time - (curve.clipIn ?? 0)) /
								(curve.speed ?? 1) +
								(curve.start ?? 0),
						);
						break;
					}
			}
		}
		return result;
	}

	function start() {
		if (!available.value || !scene) return;
		time = 0;
		animationTime = -1;
		active.value = true;
	}

	function seek(value: number) {
		if (!scene) return;
		time = Math.max(0, Math.min(value, end));
	}

	function update(delta: number, loop: boolean) {
		if (!active.value || !scene) return time;
		time += delta;
		if (loop && time > end) {
			time %= end;
			animationTime = -1;
		} else time = Math.min(time, end);
		return time;
	}

	function applyAnimations() {
		if (!scene) return;

		if (animationTime < 0 || time < animationTime) {
			states.clear();
			entries = [];
			eventIndex = 0;
			animationTime = 0;
			for (const [index, skeleton] of skeletons) {
				skeleton.setToSetupPose();
				const data = new spine.AnimationStateData(skeleton.data);
				data.defaultMix = scene.nodes[index].defaultMix ?? 0;
				for (const mix of scene.nodes[index].mixes ?? [])
					data.setMix(mix.fromName, mix.toName, mix.duration);
				states.set(index, new spine.AnimationState(data));
			}
		}
		// Replay clip boundaries when seeking, using the game's mixer settings.
		while (eventIndex < events.length && events[eventIndex].time <= time) {
			const event = events[eventIndex++];
			advanceAnimations(event.time);
			const track = scene.tracks[event.track];
			const state = states.get(track.node);
			const skeleton = skeletons.get(track.node);
			const index = track.trackIndex ?? 0;
			const clip = event.clip;
			const settings = clip.settings;
			if (event.start) {
				const duration = settings?.customDuration
					? settings.useBlendDuration
						? Math.max(clip.blendIn ?? 0, clip.easeIn ?? 0)
						: settings.mixDuration
					: null;
				let entry;
				if (
					!state.getCurrent(index) &&
					duration !== null &&
					duration > 0
				) {
					state.setEmptyAnimation(index, 0);
					entry = state.addAnimation(
						index,
						clip.name,
						clip.loop ?? false,
						0,
					);
				} else {
					entry = state.setAnimation(
						index,
						clip.name,
						clip.loop ?? false,
					);
				}
				entry.trackTime = clip.clipIn * clip.speed;
				entry.timeScale = clip.speed;
				if (duration !== null) entry.mixDuration = duration;
				if (settings) {
					entry.alpha = settings.alpha;
					entry.holdPrevious = !!settings.holdPrevious;
					entry.attachmentThreshold = settings.attachmentThreshold;
					entry.drawOrderThreshold = settings.drawOrderThreshold;
					entry.eventThreshold = settings.eventThreshold;
				}
				entries[event.track] = { entry, settings };
			} else if (
				!track.clips.some(
					(other) =>
						other.start <= event.time &&
						other.start + other.duration > event.time,
				) &&
				state.getCurrent(index) === entries[event.track]?.entry
			) {
				const previous = entries[event.track].settings;
				if (!previous?.dontEndWithClip) {
					const duration = previous?.endMixOutDuration ?? 0;
					if (duration < 0) state.getCurrent(index).timeScale = 0;
					else state.setEmptyAnimation(index, duration);
				}
			}
			state.update(0);
			state.apply(skeleton);
		}
		advanceAnimations(time);
	}

	function advanceAnimations(target: number) {
		while (animationTime < target) {
			const next = Math.min(target, animationTime + 1 / 60);
			for (const [node, state] of states) {
				state.update(next - animationTime);
				state.apply(skeletons.get(node));
			}
			animationTime = next;
		}
	}

	function sample(curve: Curve) {
		if (curve.constant !== undefined) return curve.constant;
		const curveTime =
			(time - (curve.start ?? 0)) * (curve.speed ?? 1) +
			(curve.clipIn ?? 0);
		let key = curve.keys[0];
		for (const candidate of curve.keys) {
			if (candidate.time > curveTime) break;
			key = candidate;
		}
		if (!key) return 0;
		if (curve.property === "m_IsActive" || curveTime < key.time)
			return key.value;
		const dt = curveTime - key.time;
		const [a, b, c, d] = key.coefficients;
		return ((a * dt + b) * dt + c) * dt + d;
	}

	function requestTextures() {
		if (texturesRequested || !scene || !player || !backgroundEnabled())
			return;
		texturesRequested = true;
		const request = generation;
		const context = player.sceneRenderer.context;
		const hashes = Object.keys(scene.textures ?? {});
		texturesPending = hashes.length;
		for (const hash of hashes) {
			(async () => {
				const image = new Image();
				image.src = await backgroundStore.load(hash);
				await image.decode();
				if (request !== generation) return;
				layerImages.set(hash, image);
				layerTextures.set(
					hash,
					uploadLayer(context, hash, image, false),
				);
			})()
				.catch((error) =>
					logMessage(
						`Cutscene ${cutsceneId.value}: background layer ${hash.slice(0, 8)} failed: ${error}`,
						"warning",
					),
				)
				.finally(() => {
					if (request === generation) texturesPending--;
				});
		}
	}

	function uploadLayer(
		context: any,
		hash: string,
		image: HTMLImageElement,
		premultiply: boolean,
	) {
		const gl = context.gl;
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
		const texture = new spine.GLTexture(context, image);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		if (scene?.textures?.[hash]?.repeat)
			texture.setWraps(gl.REPEAT, gl.REPEAT);
		return texture;
	}

	function premultipliedTexture(context: any, hash: string) {
		let texture = premultipliedTextures.get(hash);
		const image = layerImages.get(hash);
		if (!texture && image) {
			texture = uploadLayer(context, hash, image, true);
			premultipliedTextures.set(hash, texture);
		}
		return texture;
	}

	const quadIndices = new Uint32Array([0, 1, 2, 2, 3, 0]);

	// The game renders in linear color space; an sRGB framebuffer blends in linear too.
	let linear: {
		gl: WebGL2RenderingContext;
		shader: any;
		copy: WebGLProgram;
		texture: WebGLTexture;
		framebuffer: WebGLFramebuffer;
		width: number;
		height: number;
	} | null = null;

	function beginLinear(renderer: any) {
		const gl: WebGL2RenderingContext = renderer.context.gl;
		if (linear?.gl !== gl) {
			const fs = renderer.batcherShader.fsSource
				.replace(
					"uniform sampler2D u_texture;",
					`uniform sampler2D u_texture;
vec4 linearTexture(vec2 uv) {
	vec4 c = texture2D(u_texture, uv);
	return vec4(pow(c.rgb, vec3(2.2)), c.a);
}`,
				)
				.replaceAll(
					"texture2D(u_texture, v_texCoords)",
					"linearTexture(v_texCoords)",
				);
			const compile = (type: number, source: string) => {
				const shader = gl.createShader(type)!;
				gl.shaderSource(shader, source);
				gl.compileShader(shader);
				return shader;
			};
			const copy = gl.createProgram()!;
			gl.attachShader(
				copy,
				compile(
					gl.VERTEX_SHADER,
					`#version 300 es
out vec2 uv;
void main() {
	vec2 p = vec2(gl_VertexID & 1, gl_VertexID >> 1) * 4.0 - 1.0;
	uv = p * 0.5 + 0.5;
	gl_Position = vec4(p, 0.0, 1.0);
}`,
				),
			);
			gl.attachShader(
				copy,
				compile(
					gl.FRAGMENT_SHADER,
					`#version 300 es
precision mediump float;
in vec2 uv;
uniform sampler2D image;
out vec4 color;
void main() {
	vec4 c = texture(image, uv);
	color = vec4(pow(c.rgb, vec3(1.0 / 2.2)), c.a);
}`,
				),
			);
			gl.linkProgram(copy);
			const texture = gl.createTexture()!;
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			const framebuffer = gl.createFramebuffer()!;
			const vs = renderer.batcherShader.vsSource
				.replace(
					"= a_color;",
					"= vec4(pow(a_color.rgb, vec3(2.2)), a_color.a);",
				)
				.replace(
					"= a_color2;",
					"= vec4(pow(a_color2.rgb, vec3(2.2)), a_color2.a);",
				);
			linear = {
				gl,
				shader: new spine.Shader(renderer.context, vs, fs),
				copy,
				texture,
				framebuffer,
				width: 0,
				height: 0,
			};
		}
		const { width, height } = gl.canvas;
		if (linear.width !== width || linear.height !== height) {
			gl.bindTexture(gl.TEXTURE_2D, linear.texture);
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.SRGB8_ALPHA8,
				width,
				height,
				0,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				null,
			);
			gl.bindFramebuffer(gl.FRAMEBUFFER, linear.framebuffer);
			gl.framebufferTexture2D(
				gl.FRAMEBUFFER,
				gl.COLOR_ATTACHMENT0,
				gl.TEXTURE_2D,
				linear.texture,
				0,
			);
			linear.width = width;
			linear.height = height;
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, linear.framebuffer);
		const original = renderer.batcherShader;
		renderer.batcherShader = linear.shader;
		return original;
	}

	function endLinear(renderer: any, original: any) {
		const gl: WebGL2RenderingContext = renderer.context.gl;
		renderer.batcherShader = original;
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.disable(gl.BLEND);
		gl.useProgram(linear!.copy);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, linear!.texture);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.enable(gl.BLEND);
	}

	let whiteTexture: any = null;

	// Unity draws an Image without a sprite (or a RawImage without a texture) as a flat tinted rect.
	function solidTexture(context: any) {
		if (!whiteTexture) {
			const canvas = document.createElement("canvas");
			canvas.width = canvas.height = 1;
			const g = canvas.getContext("2d")!;
			g.fillStyle = "#fff";
			g.fillRect(0, 0, 1, 1);
			whiteTexture = new spine.GLTexture(context, canvas);
		}
		return whiteTexture;
	}

	function drawLayer(renderer: any, node: any, texture: any) {
		if (texturesPending) return;
		const w = node.size.x,
			h = node.size.y;
		if (w <= 0 || h <= 0) return;
		const m = node.matrix.values;
		const x0 = -node.pivot.x * w,
			x1 = (1 - node.pivot.x) * w,
			y0 = -node.pivot.y * h,
			y1 = (1 - node.pivot.y) * h;
		// Unity stores UI vertex colors as 8-bit values, so they never exceed 0..1.
		const clamp = (value: number) => Math.min(1, Math.max(0, value));
		const alpha = clamp(node.color.a) * clamp(node.groupAlpha);
		// Unity's multiply shader blends dst * lerp(1, color, alpha). Spine's multiply mode produces exactly
		// that with premultiplied data (texture and vertex color), but doubles the backdrop with straight alpha.
		const multiply = node.blend === "multiply";
		const tint = multiply ? alpha : 1;
		const uv = node.uvRect;
		const u0 = uv.x,
			u1 = uv.x + uv.width,
			vb = 1 - uv.y,
			vt = 1 - (uv.y + uv.height);
		let corners = [
			[x0, y0, u0, vb],
			[x1, y0, u1, vb],
			[x1, y1, u1, vt],
			[x0, y1, u0, vt],
		].map(([x, y, u, v]) => [
			m[12] + x * m[0] + y * m[4],
			m[13] + x * m[1] + y * m[5],
			u,
			v,
		]);
		// Full-screen flat colors (flashes) cover the whole view.
		const image = texture.getImage();
		if (
			image.width <= 64 &&
			image.height <= 64 &&
			Math.hypot(m[0], m[1]) * w >= 1500 &&
			Math.hypot(m[4], m[5]) * h >= 1500
		) {
			const camera = renderer.camera;
			const halfW = (camera.viewportWidth * camera.zoom) / 2;
			const halfH = (camera.viewportHeight * camera.zoom) / 2;
			const { x, y } = camera.position;
			corners = [
				[x - halfW, y - halfH, 0.5, 0.5],
				[x + halfW, y - halfH, 0.5, 0.5],
				[x + halfW, y + halfH, 0.5, 0.5],
				[x - halfW, y + halfH, 0.5, 0.5],
			];
		}
		const vertices: number[] = [];
		for (const [x, y, u, v] of corners) {
			vertices.push(
				x,
				y,
				clamp(node.color.r) * tint,
				clamp(node.color.g) * tint,
				clamp(node.color.b) * tint,
				alpha,
				u,
				v,
			);
			if (renderer.twoColorTint) vertices.push(0, 0, 0, 0);
		}
		renderer.enableRenderer(renderer.batcher);
		// Layers use straight alpha. Spine blend modes: 0 normal, 1 additive (the game's UI/Additive,
		// SrcAlpha One), 2 multiply (close to the game's Mobile/Particles/Multiply, Zero SrcColor).
		const blend = node.blend === "additive" ? 1 : multiply ? 2 : 0;
		renderer.batcher.setBlendMode(blend, multiply);
		renderer.batcher.draw(texture, vertices, quadIndices);
	}

	// State of a baked layer at `t`: null when hidden, otherwise the 18 values (linear between visible keys).
	function bakedState(keys: number[][], t: number): number[] | null {
		let low = 0,
			high = keys.length - 1;
		if (t <= keys[0][0])
			return keys[0].length > 1 ? keys[0].slice(1) : null;
		while (low < high) {
			const mid = (low + high + 1) >> 1;
			if (keys[mid][0] <= t) low = mid;
			else high = mid - 1;
		}
		const a = keys[low];
		if (a.length === 1) return null;
		const b = keys[low + 1];
		if (!b || b.length === 1) return a.slice(1);
		const f = (t - a[0]) / (b[0] - a[0]);
		const out = new Array(18);
		for (let i = 0; i < 18; i++)
			out[i] = a[i + 1] + (b[i + 1] - a[i + 1]) * f;
		return out;
	}

	function drawBaked(
		renderer: any,
		element: NonNullable<Scene["baked"]>["elements"][number],
		v: number[],
	) {
		const texture = element.solid
			? solidTexture(renderer.context)
			: element.blend === "multiply"
				? premultipliedTexture(renderer.context, element.texture!)
				: layerTextures.get(element.texture!);
		if (!texture) return;
		const [
			a,
			b,
			c,
			d,
			tx,
			ty,
			r,
			g,
			bl,
			alpha,
			rx,
			ry,
			rw,
			rh,
			u,
			uv,
			uw,
			uh,
		] = v;
		const values = new Array(16).fill(0);
		values[0] = a;
		values[1] = b;
		values[4] = c;
		values[5] = d;
		values[12] = tx;
		values[13] = ty;
		drawLayer(
			renderer,
			{
				size: { x: rw, y: rh },
				pivot: { x: rw ? -rx / rw : 0, y: rh ? -ry / rh : 0 },
				matrix: { values },
				color: { r, g, b: bl, a: alpha },
				groupAlpha: 1,
				blend: element.blend,
				uvRect: { x: u, y: uv, width: uw, height: uh },
			},
			texture,
		);
	}

	function draw() {
		if (!player || !active.value || !scene) return false;
		requestTextures();
		applyAnimations();
		const nodes = scene.nodes.map((node) => ({
			...node,
			position: { ...node.position },
			scale: { ...node.scale },
			anchorMin: { ...node.anchorMin },
			anchorMax: { ...node.anchorMax },
			quaternion: { ...(node.quaternion ?? { x: 0, y: 0, z: 0, w: 1 }) },
			euler: { ...(node.euler ?? { x: 0, y: 0, z: node.rotation ?? 0 }) },
			groupAlpha: node.groupAlpha ?? 1,
			rotated: false,
			matrix: new spine.Matrix4(),
			localZ: null as number | null,
			localX: null as number | null,
			localY: null as number | null,
			pivot: { ...node.pivot },
			size: { ...node.size },
			color: { ...node.color },
			uvRect: node.uvRect
				? { ...node.uvRect }
				: { x: 0, y: 0, width: 1, height: 1 },
			enabled: node.enabled ?? true,
		}));
		// Layers recorded from the game replace the Timeline-derived ones while the game background is on.
		const baked = scene.baked && backgroundEnabled() ? scene.baked : null;
		// The game resets the loaded cutscene before playback.
		for (const node of nodes) {
			if (node.parent >= 0) continue;
			node.position = { x: 0, y: 0 };
			node.depth = 0;
			node.scale = { x: 1, y: 1, z: 1 };
		}
		for (const curve of scene.curves) {
			const node = nodes.find((node) => node.path === curve.path);
			if (
				!node ||
				(curve.start !== undefined && time < curve.start) ||
				(curve.end !== undefined && time > curve.end)
			)
				continue;
			const value = sample(curve);
			const axis = curve.property.endsWith(".x")
				? "x"
				: curve.property.endsWith(".y")
					? "y"
					: null;
			if (curve.property === "m_Alpha") node.groupAlpha = value;
			else if (curve.property === "m_Enabled")
				node.enabled = value >= 0.5;
			else if (curve.property.startsWith("m_UVRect."))
				node.uvRect[
					curve.property.slice(9) as keyof typeof node.uvRect
				] = value;
			else if (curve.property === "m_IsActive")
				node.active = value >= 0.5;
			else if (curve.property.startsWith("m_Color."))
				node.color[
					curve.property.slice(-1) as keyof typeof node.color
				] = value;
			else if (curve.property === "m_LocalPosition.x")
				node.localX = value;
			else if (curve.property === "m_LocalPosition.y")
				node.localY = value;
			else if (curve.property === "m_LocalPosition.z")
				node.localZ = value;
			else if (axis && curve.property.startsWith("m_SizeDelta."))
				node.size[axis] = value;
			else if (axis && curve.property.startsWith("m_AnchoredPosition."))
				node.position[axis] = value;
			else if (axis && curve.property.startsWith("m_LocalScale."))
				node.scale[axis] = value;
			else if (curve.property === "m_LocalScale.z") node.scale.z = value;
			else if (curve.property.startsWith("localEulerAnglesRaw.")) {
				node.euler[
					curve.property.slice(-1) as keyof typeof node.euler
				] = value;
				node.rotated = true;
			} else if (curve.property.startsWith("m_LocalRotation."))
				node.quaternion[
					curve.property.slice(-1) as keyof typeof node.quaternion
				] = value;
			else if (axis && curve.property.startsWith("m_AnchorMin."))
				node.anchorMin[axis] = value;
			else if (axis && curve.property.startsWith("m_AnchorMax."))
				node.anchorMax[axis] = value;
			else if (axis && curve.property.startsWith("m_Pivot."))
				node.pivot[axis] = value;
		}
		for (const activation of scene.activations ?? []) {
			const node = nodes[activation.node];
			const visible = activation.clips.some(
				(clip) =>
					time >= clip.start && time < clip.start + clip.duration,
			);
			node.active = visible;
		}
		for (const node of nodes) {
			const parent = nodes[node.parent];
			let x = node.localX ?? node.position.x;
			let y = node.localY ?? node.position.y;
			if (parent) {
				node.size.x +=
					parent.size.x * (node.anchorMax.x - node.anchorMin.x);
				node.size.y +=
					parent.size.y * (node.anchorMax.y - node.anchorMin.y);
				const ax =
					node.anchorMin.x +
					(node.anchorMax.x - node.anchorMin.x) * node.pivot.x;
				const ay =
					node.anchorMin.y +
					(node.anchorMax.y - node.anchorMin.y) * node.pivot.y;
				x = node.localX ?? x + parent.size.x * (ax - parent.pivot.x);
				y = node.localY ?? y + parent.size.y * (ay - parent.pivot.y);
				node.active &&= parent.active;
				if (!node.ignoreParentGroups)
					node.groupAlpha *= parent.groupAlpha;
			}
			if (node.rotated) {
				const rx = (node.euler.x * Math.PI) / 360,
					ry = (node.euler.y * Math.PI) / 360,
					rz = (node.euler.z * Math.PI) / 360;
				const sx = Math.sin(rx),
					cx = Math.cos(rx),
					sy = Math.sin(ry),
					cy = Math.cos(ry),
					sz = Math.sin(rz),
					cz = Math.cos(rz);
				// Unity applies Euler rotations in Z, X, Y order.
				node.quaternion = {
					x: cy * sx * cz + sy * cx * sz,
					y: sy * cx * cz - cy * sx * sz,
					z: cy * cx * sz - sy * sx * cz,
					w: cy * cx * cz + sy * sx * sz,
				};
			}
			const q = node.quaternion,
				scale = node.scale;
			node.matrix.set([
				(1 - 2 * (q.y * q.y + q.z * q.z)) * scale.x,
				2 * (q.x * q.y + q.w * q.z) * scale.x,
				2 * (q.x * q.z - q.w * q.y) * scale.x,
				0,
				2 * (q.x * q.y - q.w * q.z) * scale.y,
				(1 - 2 * (q.x * q.x + q.z * q.z)) * scale.y,
				2 * (q.y * q.z + q.w * q.x) * scale.y,
				0,
				2 * (q.x * q.z + q.w * q.y) * scale.z,
				2 * (q.y * q.z - q.w * q.x) * scale.z,
				(1 - 2 * (q.x * q.x + q.y * q.y)) * scale.z,
				0,
				x,
				y,
				node.localZ ?? node.depth ?? 0,
				1,
			]);
			if (parent)
				node.matrix = new spine.Matrix4()
					.set(parent.matrix.values)
					.multiply(node.matrix);
		}
		const renderer = player.sceneRenderer;
		const gl = renderer.context.gl;
		const shader = beginLinear(renderer);
		const toLinear = (value: number) => Math.pow(value, 2.2);
		gl.clearColor(
			toLinear(player.bg.r),
			toLinear(player.bg.g),
			toLinear(player.bg.b),
			player.bg.a,
		);
		gl.clear(gl.COLOR_BUFFER_BIT);
		renderer.begin();
		const drawNode = (node: (typeof nodes)[number], index: number) => {
			if (!node.active) return;
			if (node.texture || node.solid) {
				if (baked || !backgroundEnabled() || !node.enabled) return;
				const texture = node.texture
					? node.blend === "multiply"
						? premultipliedTexture(renderer.context, node.texture)
						: layerTextures.get(node.texture)
					: solidTexture(renderer.context);
				if (texture) drawLayer(renderer, node, texture);
				return;
			}
			const skeleton = skeletons.get(index);
			if (!skeleton) return;
			skeleton.x = 0;
			skeleton.y = 0;
			skeleton.scaleX = 1;
			skeleton.scaleY = 1;
			skeleton.color.set(
				node.color.r,
				node.color.g,
				node.color.b,
				node.color.a * node.groupAlpha,
			);
			skeleton.updateWorldTransform();
			renderer.drawSkeleton(
				skeleton,
				player!.config.premultipliedAlpha,
				-1,
				-1,
				(vertices: number[], length: number, stride: number) => {
					for (let i = 0; i < length; i += stride) {
						const x = vertices[i],
							y = vertices[i + 1];
						vertices[i] =
							node.matrix.values[12] +
							x * node.matrix.values[0] +
							y * node.matrix.values[4];
						vertices[i + 1] =
							node.matrix.values[13] +
							x * node.matrix.values[1] +
							y * node.matrix.values[5];
					}
				},
			);
		};
		if (!baked) nodes.forEach(drawNode);
		else {
			// Draw in the game's order: canvas sorting first, then hierarchy order.
			const entries: { sort: number; order: number; run: () => void }[] =
				[];
			nodes.forEach((node, index) => {
				if (!skeletons.has(index)) return;
				const placed = baked.skeletons[node.path];
				let run = () => drawNode(node, index);
				if (placed?.keys) {
					const state = bakedState(placed.keys, time);
					if (!state) return; // hidden in the recording
					run = () => {
						// Use the game's own placement for this frame instead of the node tree's.
						const [a, b, c, d, tx, ty, r, g, bl, alpha] = state;
						const values = node.matrix.values;
						values[0] = a;
						values[1] = b;
						values[4] = c;
						values[5] = d;
						values[12] = tx;
						values[13] = ty;
						node.color = { r, g, b: bl, a: alpha };
						node.groupAlpha = 1;
						node.active = true;
						drawNode(node, index);
					};
				}
				entries.push({
					sort: placed ? placed.sort : 0,
					order: placed ? placed.order : 1e6 + index,
					run,
				});
			});
			for (const element of baked.elements) {
				const state = bakedState(element.keys, time);
				if (state)
					entries.push({
						sort: element.sort,
						order: element.order,
						run: () => drawBaked(renderer, element, state),
					});
			}
			entries.sort((x, y) => x.sort - y.sort || x.order - y.order);
			for (const entry of entries) entry.run();
		}
		renderer.end();
		endLinear(renderer, shader);
		return true;
	}

	return {
		available,
		active,
		incomplete,
		backgroundInfo,
		backgroundImages,
		cutsceneId,
		load,
		start,
		seek,
		update,
		draw,
		dispose,
		get duration() {
			return scene ? end : 0;
		},
	};
}

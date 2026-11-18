import { onScopeDispose, watch } from "vue";
import { platform } from "../backends";
import { useLogger } from "./useLogger";
import { useUIStore } from "../stores/ui";
import { useDownloadStore } from "../stores/downloads";
import type { DatingPoint, DatingAudio } from "../types/dating";

const downloads = new Map<string, Promise<string>>();

function download(hash: string) {
	let request = downloads.get(hash);
	if (!request) {
		request = platform.getDatingAudio(hash).then((result) => {
			for (const failure of result.failures)
				useLogger().logMessage(
					`Dating audio ${hash}.ogg: ${failure}. Loaded from GitHub fallback.`,
					"warning",
				);
			return result.data;
		});
		downloads.set(hash, request);
		request.finally(() => downloads.delete(hash)).catch(() => {});
	}
	return request;
}

export function useDatingAudio(owner: string) {
	const ui = useUIStore();
	const downloadStore = useDownloadStore();
	let scene: DatingAudio | undefined;
	let context: AudioContext | null = null;
	let generation = 0;
	let request = 0;
	let warned = false;
	let preloadId = 0;
	const buffers = new Map<string, AudioBuffer>();
	const playing = new Set<AudioBufferSourceNode>();

	function stop() {
		request++;
		for (const source of playing) source.stop();
		playing.clear();
	}

	function load(data: DatingAudio | undefined) {
		stop();
		generation++;
		preloadId++;
		downloadStore.clear(owner, "voice");
		scene = data;
		buffers.clear();
		warned = false;
		if (scene && ui.datingAudio) void preload();
	}

	async function preload() {
		const current = ++preloadId;
		const hashes = [
			...new Set(
				Object.values(scene?.events ?? {}).map((clip) => clip.file),
			),
		];
		if (!hashes.length) return;

		void downloadStore.start(
			owner,
			"voice",
			hashes.filter((hash) => !buffers.has(hash)),
			preload,
		);

		let next = 0;

		async function worker() {
			while (next < hashes.length) {
				if (current !== preloadId || !ui.datingAudio) return;
				const hash = hashes[next++];

				try {
					if (!buffers.has(hash)) {
						const encoded = await downloadStore.track(
							owner,
							hash,
							download(hash),
						);
						if (current !== preloadId || !ui.datingAudio) return;

						context ??= new AudioContext();
						const bytes = Uint8Array.from(atob(encoded), (char) =>
							char.charCodeAt(0),
						);
						const buffer = await context.decodeAudioData(
							bytes.buffer,
						);
						if (current !== preloadId || !ui.datingAudio) return;

						buffers.set(hash, buffer);
					}
				} catch (error) {
					if (current !== preloadId || !ui.datingAudio) return;
					useLogger().logMessage(
						`Could not load dating audio ${hash}.ogg: ${String(error)}`,
						"error",
					);
				}
			}
		}

		await Promise.all(
			Array.from({ length: Math.min(4, hashes.length) }, worker),
		);
	}

	async function playEvents(
		events: (string | undefined)[],
		loops: boolean[] = [],
	) {
		if (!ui.datingAudio || !scene || !context) return;
		const clips = events.flatMap((event, index) => {
			const clip = event ? scene?.events[event] : undefined;
			const buffer = clip ? buffers.get(clip.file) : undefined;
			return buffer ? [{ buffer, loop: loops[index] ?? false }] : [];
		});
		if (!clips.length) return;
		stop();
		const audioContext = context;
		const current = request;
		const loaded = generation;
		try {
			if (audioContext.state !== "running") await audioContext.resume();
			if (current !== request || loaded !== generation || !ui.datingAudio)
				return;
			const startTime = audioContext.currentTime;
			for (const { buffer, loop } of clips) {
				const source = audioContext.createBufferSource();
				source.buffer = buffer;
				source.loop = loop;
				source.connect(audioContext.destination);
				source.onended = () => {
					playing.delete(source);
					source.disconnect();
				};
				playing.add(source);
				source.start(startTime);
			}
		} catch (error) {
			if (!warned) console.warn("Could not play dating audio:", error);
			warned = true;
		}
	}

	function play(
		point: DatingPoint,
		action: "click" | "motion" | "loop" | "success" | "fail",
		index = 0,
	) {
		if (index < 0) return;
		const row = scene?.points[`${point.group}:${point.id}`];
		if (!row) return;
		const prefix =
			action === "click"
				? "sound"
				: action === "motion"
					? "soundMotion"
					: `longPress${action[0].toUpperCase()}${action.slice(1)}`;
		const sound = (kind: "Voice" | "FX") => {
			const names = row[`${prefix}${kind}Name`] as string[] | undefined;
			if (
				action !== "click" &&
				action !== "motion" &&
				row[`isLongPress${kind}AutoIndex`]
			)
				return names?.[0]
					? `${names[0]}_${String(index + 1).padStart(2, "0")}`
					: undefined;
			return names?.[index];
		};
		const voice = sound("Voice");
		const loops = ["Voice", "FX"].map((kind) => {
			const flags = row[
				`isLoopLongPressLoop${kind === "FX" ? "Fx" : kind}`
			] as number[] | undefined;
			return (
				action === "loop" &&
				flags?.[row[`isLongPress${kind}AutoIndex`] ? 0 : index] === 1
			);
		});
		void playEvents(
			[voice ? `event:/Voices/${voice}_KR` : undefined, sound("FX")],
			loops,
		);
	}

	watch(
		() => ui.datingAudio,
		(value) => {
			if (value) void preload();
			else {
				stop();
				preloadId++;
				downloadStore.clear(owner, "voice");
			}
		},
	);
	onScopeDispose(() => {
		stop();
		generation++;
		preloadId++;
		void context?.close();
		buffers.clear();
	});
	return {
		load,
		play,
		stop,
		playEvents,
	};
}

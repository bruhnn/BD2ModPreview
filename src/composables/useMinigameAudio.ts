import { onScopeDispose, watch } from "vue";
import { useUIStore } from "../stores/ui";

export function useMinigameAudio() {
	const ui = useUIStore();
	const buffers = new Map<string, AudioBuffer>();
	const playing = new Set<AudioBufferSourceNode>();
	let context: AudioContext | null = null;
	let urls: string[] = [];
	let generation = 0;

	function stop() {
		generation++;
		for (const source of playing) source.stop();
		playing.clear();
	}

	async function load(sounds: string[]) {
		stop();
		urls = [...new Set(sounds)];
		buffers.clear();
		if (!ui.minigameAudio || !urls.length) return;
		const current = generation;
		context ??= new AudioContext();
		const audioContext = context;
		for (const url of urls) {
			try {
				const response = await fetch(url);
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				const buffer = await audioContext.decodeAudioData(
					await response.arrayBuffer(),
				);
				if (current !== generation) return;
				buffers.set(url, buffer);
			} catch (error) {
				if (current !== generation) return;
				console.warn("Could not load minigame sound:", url, error);
			}
		}
	}

	async function play(url: string | undefined) {
		const buffer = url ? buffers.get(url) : undefined;
		if (!ui.minigameAudio || !context || !buffer) return;
		const current = generation;
		const audioContext = context;
		try {
			if (audioContext.state !== "running") await audioContext.resume();
			if (current !== generation || !ui.minigameAudio) return;
			// Keep rapid hits from accumulating.
			if (playing.size >= 10) {
				const oldest = playing.values().next().value!;
				oldest.stop();
				playing.delete(oldest);
			}
			const source = audioContext.createBufferSource();
			source.buffer = buffer;
			source.connect(audioContext.destination);
			source.onended = () => {
				playing.delete(source);
				source.disconnect();
			};
			playing.add(source);
			source.start();
		} catch (error) {
			console.warn("Could not play minigame sound:", error);
		}
	}

	watch(
		() => ui.minigameAudio,
		() => {
			void load(urls);
		},
	);
	onScopeDispose(() => {
		stop();
		buffers.clear();
		void context?.close();
	});
	return { load, play };
}

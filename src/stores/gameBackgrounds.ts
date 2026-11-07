import { defineStore } from "pinia";
import { ref } from "vue";
import { useLocalStorage } from "@vueuse/core";
import { invoke } from "@tauri-apps/api/core";

export interface BackgroundPrompt {
	key: string;
	count: number;
	bytes: number;
}

export const useGameBackgroundStore = defineStore("gameBackgrounds", () => {
	// Whether to download without asking, and whether cutscenes use the game background at all.
	const mode = useLocalStorage<"ask" | "always">("GAME_BACKGROUND_MODE", "ask");
	const showByDefault = useLocalStorage("GAME_BACKGROUND_SHOW", true);
	const cacheSize = ref(0);
	const prompt = ref<BackgroundPrompt | null>(null);
	const decided = new Set<string>();
	const loaded = new Map<string, Promise<string>>();
	let pendingApply: (() => void) | null = null;

	// Data URI of an image; downloaded once, then read from memory or the disk cache.
	function load(hash: string): Promise<string> {
		let request = loaded.get(hash);
		if (!request) {
			request = invoke<string>("get_game_background", { hash });
			request.then(refreshCacheSize, () => loaded.delete(hash));
			loaded.set(hash, request);
		}
		return request;
	}

	async function refreshCacheSize() {
		cacheSize.value = await invoke<number>("get_game_background_cache_size");
	}

	async function clearCache() {
		await invoke("clear_game_background_cache");
		loaded.clear();
		await refreshCacheSize();
	}

	// Called when a game cutscene starts; no prompt when the images are already downloaded.
	async function offer(
		key: string,
		hashes: string[],
		bytes: number,
		apply: () => void,
	) {
		if (!showByDefault.value || decided.has(key)) return;
		if (
			mode.value === "always" ||
			(await invoke<boolean>("has_game_backgrounds", { hashes }))
		) {
			decided.add(key);
			apply();
		} else if (!prompt.value) {
			prompt.value = { key, count: hashes.length, bytes };
			pendingApply = apply;
		}
	}

	function answer(accept: boolean, remember: boolean) {
		if (!prompt.value) return;
		decided.add(prompt.value.key);
		prompt.value = null;
		if (remember) {
			if (accept) mode.value = "always";
			else showByDefault.value = false;
		}
		if (accept) pendingApply?.();
		pendingApply = null;
	}

	return { mode, showByDefault, cacheSize, prompt, load, refreshCacheSize, clearCache, offer, answer };
});

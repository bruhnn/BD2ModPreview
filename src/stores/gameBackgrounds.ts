import { defineStore } from "pinia";
import { ref } from "vue";
import { useLocalStorage } from "@vueuse/core";
import { platform } from "../backends";

export interface BackgroundPrompt {
	key: string;
	count: number;
	bytes: number;
}

export const useGameBackgroundStore = defineStore("gameBackgrounds", () => {
	const mode = useLocalStorage<"ask" | "always">("GAME_BACKGROUND_MODE", "ask");
	const showByDefault = useLocalStorage("GAME_BACKGROUND_SHOW", true);
	const cacheSize = ref(0);
	const prompt = ref<BackgroundPrompt | null>(null);
	const decided = new Set<string>();
	const loaded = new Map<string, Promise<string>>();
	let pendingApply: (() => void) | null = null;

	function load(hash: string): Promise<string> {
		let request = loaded.get(hash);
		if (!request) {
			request = platform.getGameBackground(hash);
			request.then(refreshCacheSize, () => loaded.delete(hash));
			loaded.set(hash, request);
		}
		return request;
	}

	async function refreshCacheSize() {
		cacheSize.value = await platform.getGameBackgroundCacheSize();
	}

	async function clearCache() {
		await platform.clearGameBackgroundCache();
		loaded.clear();
		await refreshCacheSize();
	}

	async function offer(
		key: string,
		hashes: string[],
		bytes: number,
		apply: () => void,
	) {
		if (!showByDefault.value || decided.has(key)) return;
		if (
			mode.value === "always" ||
			(await platform.hasGameBackgrounds(hashes))
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

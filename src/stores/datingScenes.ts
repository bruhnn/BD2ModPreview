import { defineStore } from "pinia";
import { getVersion } from "@tauri-apps/api/app";
import { onScopeDispose, shallowRef } from "vue";
import { useUIStore } from "./ui";
import { useLogger } from "../composables/useLogger";
import type { DatingScene } from "../types/dating";

export const useDatingScenesStore = defineStore("datingScenes", () => {
	const { logMessage } = useLogger();

	const scenes = shallowRef<{ [key: string]: DatingScene }>({})
	const cacheKey = "DATING_SCENES_CACHE"

	let pending: Promise<void> | null = null
	let expiration: ReturnType<typeof setTimeout> | undefined

	function clearCache() {
		clearTimeout(expiration)
		scenes.value = {}
		try {
			localStorage.removeItem(cacheKey)
		} catch (error) {
			logMessage(`Failed to clear dating cache: ${error}`, "warning")
		}
	}

	function expireAt(expiresAt: number) {
		clearTimeout(expiration)

		expiration = setTimeout(
			clearCache,
			Math.max(0, expiresAt - Date.now()),
		)
	}

	function load() {
		if (pending) return pending

		pending = (async () => {
			const machineId = await useUIStore().loadMachineId()

			try {
				const cache = JSON.parse(
					localStorage.getItem(cacheKey) ?? "null",
				)

				if (
					cache?.machine_id === machineId &&
					Date.parse(cache.expires_at) > Date.now()
				) {
					scenes.value = cache.scenes;
					expireAt(
						Math.min(
							Date.parse(cache.expires_at),
							Date.now() + 7 * 24 * 60 * 60 * 1000,
						),
					)
				} else {
					clearCache()
				}
			} catch (error) {
				clearCache();
				logMessage(`Failed to read dating cache: ${error}`, "warning");
			}

			const response = await fetch(
				"https://shy-waterfall-2797.bruhnn.workers.dev/datings",
				{
					cache: "no-store",
					headers: {
						"X-Machine-ID": machineId,
						"X-Preview-Version": await getVersion(),
					},
				},
			)

			if (response.status === 401 || response.status === 403) {
				clearCache()
				return
			}

			if (!response.ok) {
				throw new Error(
					`Failed to load dating scenes: ${response.status}`,
				)
			}

			const data = await response.json()

			const expiresAt = Math.min(
				Date.now() + 7 * 24 * 60 * 60 * 1000,
				data.expires_at === undefined
					? Infinity
					: Date.parse(data.expires_at),
			)

			if (!Number.isFinite(expiresAt)) {
				throw new Error("Invalid dating cache expiration")
			}

			if (expiresAt <= Date.now()) {
				clearCache()
				return
			}

			scenes.value = data.scenes ?? data

			expireAt(expiresAt)

			try {
				localStorage.setItem(
					cacheKey,
					JSON.stringify({
						machine_id: machineId,
						expires_at: new Date(expiresAt).toISOString(),
						scenes: scenes.value,
					}),
				);
			} catch (error) {
				logMessage(`Failed to save dating cache: ${error}`, "warning")
			}
		})().finally(() => {
			pending = null
		})

		return pending
	}

	onScopeDispose(() => clearTimeout(expiration))

	return { 
    scenes: scenes,
     load };
});

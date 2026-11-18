import { defineStore } from "pinia";
import { ref } from "vue";
import { platform } from "../backends";

export type DownloadKind = "background" | "voice";

export interface Download {
	owner: string;
	kind: DownloadKind;
	id: string;
	state: "loading" | "done" | "failed";
	source: string | null;
	received: number;
	total: number | null;
	error: string;
}

export const useDownloadStore = defineStore("downloads", () => {
	const items = ref<Download[]>([]);
	const retries = new Map<string, () => void>();

	void platform.onAssetDownload((event) => {
		for (const item of items.value) {
			if (item.id !== event.id || item.state !== "loading") continue;

			if (event.type === "start") {
				item.source = event.source;
				item.received = 0;
				item.total = null;
			} else {
				item.received = event.received;
				item.total = event.total;
			}
		}
	});

	async function start(owner: string, kind: DownloadKind, ids: string[], retry: () => void) {
		clear(owner, kind);
		retries.set(`${owner}:${kind}`, retry);

		for (const id of ids) {
			items.value.push({
				owner,
				kind,
				id,
				state: "loading",
				source: null,
				received: 0,
				total: null,
				error: "",
			});
		}

		const missing = new Set(await platform.missingAssets(kind, ids).catch(() => ids));

		items.value = items.value.filter(
			(item) => item.owner !== owner || item.kind !== kind || missing.has(item.id),
		);
	}

	function track<T>(owner: string, id: string, request: Promise<T>): Promise<T> {
		const item = items.value.find((item) => item.owner === owner && item.id === id);

		if (item) {
			Object.assign(item, { state: "loading", received: 0, total: null, error: "" });

			request.then(
				() => (item.state = "done"),
				(error) => {
					item.state = "failed";
					item.error = String(error);
				},
			);
		}

		return request;
	}

	function retry(owner: string, kind: DownloadKind) {
		retries.get(`${owner}:${kind}`)?.();
	}

	function clear(owner: string, kind?: DownloadKind) {
		items.value = items.value.filter(
			(item) => item.owner !== owner || (kind && item.kind !== kind),
		);

		for (const key of kind ? [kind] : ["background", "voice"]) {
			retries.delete(`${owner}:${key}`);
		}
	}

	return { items, start, track, retry, clear };
});

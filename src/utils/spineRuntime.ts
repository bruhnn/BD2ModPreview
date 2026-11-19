export type SpineVersion = "4.1" | "4.2";

declare global {
	interface Window {
		spine41: any;
		spine42: any;
	}
}

const HEADER_BYTES = 512;
const playerRuntimes = new WeakMap<object, any>();

export function spineRuntime(version: SpineVersion = "4.1"): any {
	return version === "4.2" ? window.spine42 : window.spine41;
}

export function createSpinePlayer(
	version: SpineVersion,
	container: HTMLElement,
	config: any,
) {
	const player = new (spineRuntime(version).SpinePlayer)(container, config);
	playerRuntimes.set(player, spineRuntime(version));
	return player;
}

export function runtimeOf(player: object | null | undefined): any {
	return (player && playerRuntimes.get(player)) ?? spineRuntime();
}

export function updateWorldTransform(runtime: any, skeleton: any) {
	skeleton.updateWorldTransform(runtime.Physics?.update);
}

export function runtimeForVersion(version: string | null): SpineVersion {
	const [major, minor] = (version ?? "").split(".").map(Number);
	return major > 4 || (major === 4 && minor >= 2) ? "4.2" : "4.1";
}

export async function detectSpineVersion(
	path: string,
	rawData?: Record<string, string>,
): Promise<string | null> {
	try {
		const header = await readHeader(rawData?.[path] ?? path);
		if (!header) return null;
		return /\.json(?:[?#]|$)/i.test(path)
			? jsonVersion(header)
			: binaryVersion(header);
	} catch {
		return null;
	}
}

async function readHeader(url: string): Promise<Uint8Array | null> {
	if (url.startsWith("data:")) {
		const comma = url.indexOf(",");
		const data = url.slice(comma + 1);

		if (!url.slice(0, comma).endsWith(";base64"))
			return new TextEncoder().encode(
				decodeURIComponent(data).slice(0, HEADER_BYTES),
			);

		const chunk = data.slice(0, Math.ceil(HEADER_BYTES / 3) * 4);
		return Uint8Array.from(atob(chunk), (c) => c.charCodeAt(0));
	}

	const response = await fetch(url);
	if (!response.ok || !response.body) return null;

	const reader = response.body.getReader();
	const header = new Uint8Array(HEADER_BYTES);
	let length = 0;

	while (length < HEADER_BYTES) {
		const { done, value } = await reader.read();
		if (done) break;
		const count = Math.min(value.length, HEADER_BYTES - length);
		header.set(value.subarray(0, count), length);
		length += count;
	}
	reader.cancel().catch(() => {});

	return header.subarray(0, length);
}

function jsonVersion(header: Uint8Array) {
	const text = new TextDecoder().decode(header);
	return text.match(/"spine"\s*:\s*"([^"]+)"/)?.[1] ?? null;
}

function binaryVersion(header: Uint8Array) {
	let offset = 8;
	let length = 0;

	for (let shift = 0; shift < 35; shift += 7) {
		if (offset >= header.length) return null;
		const byte = header[offset++];
		length |= (byte & 0x7f) << shift;
		if (!(byte & 0x80)) break;
	}

	if (length < 2 || offset + length - 1 > header.length) return null;

	const version = new TextDecoder().decode(
		header.subarray(offset, offset + length - 1),
	);
	return /^\d+\.\d+/.test(version) ? version : null;
}

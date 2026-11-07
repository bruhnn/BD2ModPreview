// Scenery backgrounds from the game's story scenes (2048x2048), each with a 256px thumbnail in the asset repo.
export const NOVEL_BACKGROUNDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 53, 54, 55, 56, 57, 58, 59, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 176, 177, 178, 179, 180, 181, 182, 183, 184, 187, 188, 190];

const GITHUB = "https://raw.githubusercontent.com/bruhnn/Brown-Dust-2-Asset/refs/heads/master/ui/novel_background/";
// VITE_ASSET_BASE (for example http://127.0.0.1:8787/) points at a local copy of the asset repo.
const BASE = import.meta.env.VITE_ASSET_BASE
	? `${import.meta.env.VITE_ASSET_BASE}ui/novel_background/`
	: "https://cdn.jsdelivr.net/gh/bruhnn/Brown-Dust-2-Asset@master/ui/novel_background/";

export const novelThumbnail = (id: number) => `${BASE}thumb/novel_background_${id}.webp`;

// jsDelivr first, GitHub if it refuses (the asset repo is over its size limit). Resolves to the URL that loaded.
export async function loadNovelBackground(id: number) {
	for (const base of [BASE, GITHUB]) {
		const image = new Image();
		image.src = `${base}novel_background_${id}.png`;
		try {
			await image.decode();
			return image.src;
		} catch {}
	}
	return null;
}

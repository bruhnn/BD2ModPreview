import { readonly, shallowRef } from "vue";
import { defineStore } from "pinia";
import { Character, LocalizedName } from "../types/character";
import { useI18n } from "vue-i18n"
import { useLogger } from "../composables/useLogger";

function compareVersions(a: string, b: string): number {
	const v1 = a.split(".").map(Number);
	const v2 = b.split(".").map(Number);

	for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
		const diff = (v1[i] ?? 0) - (v2[i] ?? 0);
		if (diff !== 0) return Math.sign(diff);
	}

	return 0;
}

interface CharactersJson {
	version: string;
	characters: Character[];
	dating: DatingMap;
}

type DatingMap = Record<string, string>;

const CHARACTERS_URL =
	"https://cdn.jsdelivr.net/gh/bruhnn/BD2ModManager@main/src-tauri/data/characters.json";

export const useCharactersStore = defineStore("characters", () => {
	const { logMessage } = useLogger();
	const { locale } = useI18n()

	const currentVersionLoaded: string | null = null;

	const characters = shallowRef<Character[]>([]);
	const datingMap = shallowRef<DatingMap>({});

	function getLocalizedName(names: LocalizedName) {
		const language: Record<string, keyof LocalizedName> = {
			en_US: "en", zh_CN: "cn", ja_JP: "jp", ko_KR: "kr", zh_TW: "tw",
		}
		return names[language[locale.value] ?? "en"] || names.en
	}

	function getCharacterById(id: string) {
		return characters.value.find((char) => char.id === id);
	}

	function getCharacterByDatingId(id: string) {
		return characters.value.find((char) => char.dating_id === id);
	}

	function getCharacterIdByDatingId(id: string) {
		return datingMap.value[id];
	}

	async function loadCharacters() {
		await loadLocalCharacters();

		loadRemoteCharacters()
			.then((success) => {
				if (success) {
					logMessage(
						"Characters loaded successfully from remote repository",
						"info",
					);
				} else {
					logMessage(
						"Failed to load characters from remote repository, using local data",
						"warning",
					);
				}
			})
			.catch((error) => {
				logMessage(`Error loading characters: ${error}`, "error");
			});
	}

	async function loadLocalCharacters() {
		try {
			const response = await fetch("/data/characters.json");
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = (await response.json()) as CharactersJson;

			const existingIds = new Set(characters.value.map((c) => c.id));
			const newCharacters = data.characters.filter(
				(c) => !existingIds.has(c.id),
			);

			characters.value = [...characters.value, ...newCharacters];
			datingMap.value = { ...datingMap.value, ...data.dating };

			console.log("Local characters loaded:", data.characters.length);
		} catch (error) {
			console.error(
				"Failed to load characters from public folder:",
				error,
			);
		}
	}

	async function loadRemoteCharacters() {
		try {
			const response = await fetch(CHARACTERS_URL, {
				method: "GET",
				cache: "no-store",
			});
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = (await response.json()) as CharactersJson;

			if (
				!compareVersions(
					data["version"],
					currentVersionLoaded ?? "0.0.0",
				)
			) {
				return;
			}

			characters.value = data.characters;
			datingMap.value = data.dating;

			console.log("Remote characters loaded:", data.characters.length);

			return true;
		} catch (error) {
			console.error(
				`Failed to load characters from ${CHARACTERS_URL}:`,
				error,
			);
		}

		return false;
	}

	return {
		characters: readonly(characters),
		loadCharacters,
		getCharacterById,
		getLocalizedName,
		getCharacterIdByDatingId,
		getCharacterByDatingId,
	};
});

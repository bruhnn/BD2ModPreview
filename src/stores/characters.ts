import { readonly, ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import { Character } from "../types/character";
import { useLogger } from "../composables/useLogger";

interface CharactersJson {
  characters: Character[];
  dating: DatingMap;
}

type DatingMap = Record<number, string>;

const CHARACTERS_URL = "https://cdn.jsdelivr.net/gh/bruhnn/BD2ModPreview@main/public/data/characters.json"

export const useCharactersStore = defineStore("characters", () => {
    const { logMessage } = useLogger()

    const characters = shallowRef<Character[]>([]);
    const datingMap = shallowRef<DatingMap>({})

    function getCharacterById(id: string) {
        return characters.value.find((char) => char.id === id);
    }

    function getCharacterByDatingId(id: string) {
        return characters.value.find((char) => char.dating_id === id);
    }

    function getCharacterIdByDatingId(id: string) {
        return datingMap.value[id]
    }

    async function loadCharacters() {
        await loadLocalCharacters()
        return
        loadRemoteCharacters().then((success) => {
            if (success) {
                logMessage("Characters loaded successfully from remote repository", "info");
            } else {
                logMessage("Failed to load characters from remote repository, using local data", "warning");
            }
        }).catch((error) => {
            logMessage(`Error loading characters: ${error}`, "error");
        });
    }

    async function loadLocalCharacters() {
        // TODO: load from github for the latest characters
        try {
            const response = await fetch('/data/characters.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json() as CharactersJson

            characters.value = data.characters;
            datingMap.value = data.dating

            console.log("Local characters loaded:", characters.value.length);
        } catch (error) {
            console.error("Failed to load characters from public folder:", error);
        }
    }

    async function loadRemoteCharacters() {
        // TODO: load from github for the latest characters
        try {
            const response = await fetch(CHARACTERS_URL, {
                method: "GET",
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json() as CharactersJson

            characters.value = data.characters;
            datingMap.value = data.dating

            console.log("Remote characters loaded:", characters.value.length);

            return true
        } catch (error) {
            console.error(`Failed to load characters from ${CHARACTERS_URL}:`, error);
        }

        return false;
    }

    return {
        characters: readonly(characters),
        loadCharacters,
        getCharacterById,
        getCharacterByDatingId,
        getCharacterIdByDatingId
    }
});
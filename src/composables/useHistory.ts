import { computed, readonly } from "vue";
import { useLocalStorage } from "@vueuse/core";
import { SpineSource } from "../types/spine";
import { HistoryItem } from "../types/history";

const MAX_HISTORY_ITEMS = 50;

export function useHistory() {
    const history = useLocalStorage<HistoryItem[]>("HISTORY", []);
    const nextId = useLocalStorage<number>("HISTORY_NEXT_ID", 0);

    const sortedHistory = computed(() => {
        return history.value.slice().sort((itemA, itemB) => new Date(itemB.timestamp).getTime() - new Date(itemA.timestamp).getTime())
    })

    function addToHistory(source: SpineSource, characterId?: string | null, modType?: string | null, title?: string) {
        const index = history.value.findIndex(item => source.type === "folder"
            ? item.source.type === "folder" && item.source.path === source.path
            : item.source.type === "url" && item.source.skeletonUrl === source.skeletonUrl && item.source.atlasUrl === source.atlasUrl);

        if (index !== -1) {
            const item = history.value[index];
            history.value[index] = { ...item, title: title ?? item.title, timestamp: new Date().toISOString() };
        } else {
            // add item

            // remove the last one if it is max
            if (history.value.length >= MAX_HISTORY_ITEMS) {
                history.value = history.value
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, MAX_HISTORY_ITEMS - 1);
            }

            history.value.push({
                id: nextId.value,
                title,
                source,
                characterId,
                modType,
                timestamp: new Date().toISOString(),
            });

            nextId.value++
        }
    }

    function removeFromHistory(id: number) {
        const index = history.value.findIndex((hItem) => hItem.id === id);
        if (index !== -1) { 
            history.value.splice(index, 1);
        }
    }

    function clearHistory() {
        history.value = [];
        nextId.value = 0;
    }

    return {
        history: readonly(sortedHistory),
        addToHistory,
        removeFromHistory,
        clearHistory
    }
}
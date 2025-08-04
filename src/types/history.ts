import { SpineSource } from "./spine";

export interface HistoryItem {
    id: number,
    source: SpineSource,
    characterId?: string | null,
    modType?: string | null
    timestamp: string
}
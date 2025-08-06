interface SpineAsset {
    skeleton: string,
    atlas: string
}

interface DatingSpineAsset extends SpineAsset {
    id: string
}

export interface Character {
    id: string,
    character: string,
    costume: string,
    character_image: string,
    character_skill_preview?: string,
    standing?: boolean,
    cutscene?: boolean,
    dating_id?: string,
    release_date?: string,
}
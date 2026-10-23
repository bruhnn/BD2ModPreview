export type LocalizedName = Record<"en" | "cn" | "jp" | "tw" | "kr", string>

export interface Character {
    id: string,

    /** @deprecated use character_name instead */
    character: string,
    /** @deprecated use costume_name instead */
    costume: string,
    /** @deprecated use assets.character_image instead */
    character_image: string,
    /** @deprecated use assets.skill_image instead */
    skill_preview_image?: string,

    is_collab: boolean,
    cutscene: boolean,
    standing: boolean,
    dating_id?: string | null,
    release_date?: string,
    gender: "male" | "female",
    costume_id: string,
    character_id: number,
    character_name: LocalizedName,
    costume_name: LocalizedName,
    skin_type: string,
    grade: number,
    element: string,
    assets: {
        head_image: string,
        character_image: string,
        skill_image: string,
    },
}
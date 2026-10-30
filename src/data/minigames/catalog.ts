// RhythmGameCharTable: character ID and costume ID.
export const minigameCatalog = [
  { id: 1, costumeId: "067201" },
  { id: 2, costumeId: "061404" },
  { id: 3, costumeId: "000707" },
  { id: 4, costumeId: "001107" },
  { id: 5, costumeId: "003302" },
].map(character => ({
  ...character,
  name: "Slap Slap Slop",
  skeleton: "misc/rhythmhitanim/RhythmHitAnim.skel",
  atlas: "misc/rhythmhitanim/RhythmHitAnim.atlas",
  animation: `_char${String(character.id).padStart(3, "0")}`,
}))

export type MinigameEntry = typeof minigameCatalog[number]

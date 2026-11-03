import rhythmHit from "../../assets/audio/minigames/rhythm-hit.ogg"
import rhythmFever from "../../assets/audio/minigames/rhythm-fever.ogg"

export type MinigameAction = "tap" | "hold" | "release" | "slide"

export interface MinigameDefinition {
  id: string
  sounds?: Partial<Record<MinigameAction | "fever", string>>
  characters: (animations: string[]) => string[]
  idle: (character: string, fever: boolean) => string
  reactions: (action: MinigameAction, left: boolean, fever: boolean) => string[]
}

// Add other minigames here. Input and playback stay in useMinigameInteractions.
export const minigames: MinigameDefinition[] = [{
  id: "rhythm",
  sounds: { tap: rhythmHit, hold: rhythmHit, slide: rhythmHit, fever: rhythmFever },
  characters: animations => animations.filter(name => /^_char\d{3}$/.test(name)).sort(),
  idle: (character, fever) => character + (fever ? "fever" : ""),
  reactions: (action, left, fever) => {
    const side = left ? "l" : "r"
    if (fever) return action === "tap" ? Array.from({ length: 5 }, (_, i) => `_fever_${side}_${i}`) : []
    switch (action) {
      case "tap": return ["", "_1", "_2"].map(suffix => `_hit1_${side}${suffix}`)
      case "hold": return [`_hit2start_${side}`]
      case "release": return [`_hit2end_${side}`]
      case "slide": return [`_hit3_${side}`]
    }
  },
}]

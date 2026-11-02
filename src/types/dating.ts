export interface DatingScene {
  skeleton: string
  audio?: DatingAudio
  groups: DatingGroup[]
  points: DatingPoint[]
}

export type DatingScenes = {
  [key: string]: DatingScene
}

export interface DatingGroup {
  id: number
  animation: string
  skeleton?: string | null
  switchAnimation?: string
  keepTool: boolean
  tools: DatingTool[]
  gauge: DatingGauge
}

export interface DatingTool {
  id: number
  skin: string
}

export interface DatingGauge {
  IsOn: boolean
  StartScore: number
  MinMaxScore: { x: number; y: number }
  AutoDecreaseScoreMinMaxLimit: { x: number; y: number }
  AutoDecreaseScorePerSecond: number
  MotionNameByScoreList: DatingScoreMotion[]
}

export interface DatingScoreMotion {
  Score: number
  VoiceSoundEventName?: string
  SFXSoundEventName?: string
  MixAnimationName: string
  IsCanPlayWhenIncreaseScore: boolean
  IsCanPlayWhenDecreaseScore: boolean
}

export interface DatingPoint {
  id?: number
  key: string
  group: number
  tool: number
  bone: string
  corners: number[][]
  drag: boolean
  resetOnRelease?: boolean
  radius: number
  clickMax: number
  clickReset: number
  random: boolean
  animations: string[]
  nextGroup: number
  motions: string[]
  collider: number[][]
  destinations: (DatingRegion | null)[]
  zone: DatingRegion | null
  gauge: {
    IsOn: boolean
    InteractableMinMaxRange: { x: number; y: number }
    Scores: number[]
    LongPressSuccessScore: number
    LongPressFailScore: number
  }
  hold: {
    mode: number
    time: number
    loop: string[]
    success: string[]
    fail: string[]
  }
  hidden: {
    points: string[]
    duration: number
    exclusive: boolean
    reset: boolean
    closeParent: boolean
  }
}

export interface DatingRegion {
  bone: string
  corners: number[][]
}

export interface DatingAudio {
  points: Record<string, Record<string, string[] | number | number[]>>
  events: Record<string, { file: string; loop: boolean }>
}

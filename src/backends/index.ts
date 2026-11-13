import type { SpineAssetsData } from "../types/spine"
import tauri from "./tauri"
import electron from "./electron"

export interface LaunchArgs {
  paths: string[]
  theme: string | null
  language: string | null
}


export type DragDropEvent =
  | { type: "over" | "drop"; x: number; y: number; paths: string[] }
  | { type: "leave" }

export interface FileFilter {
  name: string
  extensions: string[]
}

export interface DatingAudioDownload {
  data: string
  failures: string[]
}

export interface ManagerMod {
  name: string
  path: string
  enabled: boolean
  errors: string[]
}

export type ManagerEvent =
  | { type: "state"; mods: ManagerMod[] }
  | { type: "disconnected" }

export interface Platform {
  getVersion(): Promise<string>
  getUserLocale(): Promise<string>
  getMachineId(): Promise<string>
  getLaunchArgs(): Promise<LaunchArgs>
  openUrl(url: string): Promise<void>

  showWindow(): Promise<void>
  isAlwaysOnTop(): Promise<boolean>
  setAlwaysOnTop(value: boolean): Promise<void>
  saveWindowState(): Promise<void>
  onDragDrop(handler: (event: DragDropEvent) => void): Promise<() => void>

  pickFolder(): Promise<string | null>

  saveFile(defaultName: string, filters: FileFilter[], bytes: Uint8Array): Promise<string | null>

  readAppDataText(path: string): Promise<string | null>
  writeAppDataText(path: string, text: string): Promise<void>

  getSpineAssets(folderPath: string): Promise<SpineAssetsData>

  getModBackgrounds(folderPath: string): Promise<[string, string][]>

  getDatingAudio(hash: string): Promise<DatingAudioDownload>
  getGameBackground(hash: string): Promise<string>
  hasGameBackgrounds(hashes: string[]): Promise<boolean>
  getGameBackgroundCacheSize(): Promise<number>
  clearGameBackgroundCache(): Promise<void>

  connectToManager(): Promise<void>
  setModEnabledOnManager(modName: string, enabled: boolean): Promise<{ mods: ManagerMod[] }>
  onManagerEvent(handler: (event: ManagerEvent) => void): Promise<() => void>
}

export const isElectron = "electron" in window

export const platform: Platform = isElectron ? electron : tauri

import { invoke } from "@tauri-apps/api/core"
import { getVersion } from "@tauri-apps/api/app"
import { listen } from "@tauri-apps/api/event"
import { getCurrentWebview } from "@tauri-apps/api/webview"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { getMatches } from "@tauri-apps/plugin-cli"
import { open, save } from "@tauri-apps/plugin-dialog"
import { BaseDirectory, exists, mkdir, readTextFile, rename, writeFile, writeTextFile } from "@tauri-apps/plugin-fs"
import { openUrl } from "@tauri-apps/plugin-opener"
import { saveWindowState, StateFlags } from "@tauri-apps/plugin-window-state"
import type { ManagerMod, Platform } from "."

const appData = { baseDir: BaseDirectory.AppData }

export default {
  getVersion,
  getUserLocale: () => invoke("get_user_locale"),
  getMachineId: () => invoke("get_machine_id"),

  async getLaunchArgs() {
    const { args } = await getMatches()
    const text = (value: unknown) => (typeof value === "string" ? value : null)
    const path = args.path?.value

    return {
      paths: (Array.isArray(path) ? path : [path]).filter((p): p is string => typeof p === "string" && !!p),
      theme: text(args.theme?.value),
      language: text(args.language?.value),
    }
  },

  openUrl: url => openUrl(url),

  showWindow: () => getCurrentWindow().show(),
  isAlwaysOnTop: () => getCurrentWindow().isAlwaysOnTop(),
  setAlwaysOnTop: value => getCurrentWindow().setAlwaysOnTop(value),
  saveWindowState: () => saveWindowState(StateFlags.ALL),

  onDragDrop: handler =>
    getCurrentWebview().onDragDropEvent(({ payload }) => {
      if (payload.type === "leave") return handler({ type: "leave" })

      handler({
        type: payload.type === "drop" ? "drop" : "over",
        x: payload.position.x / window.devicePixelRatio,
        y: payload.position.y / window.devicePixelRatio,
        paths: "paths" in payload ? payload.paths : [],
      })
    }),

  async pickFolder() {
    const path = await open({ directory: true, multiple: false })
    return typeof path === "string" ? path : null
  },

  async saveFile(defaultName, filters, bytes) {
    const path = await save({ defaultPath: defaultName, filters })
    if (path) await writeFile(path, bytes)
    return path
  },

  async readAppDataText(path) {
    if (!(await exists(path, appData))) return null
    return readTextFile(path, appData)
  },

  async writeAppDataText(path, text) {
    const directory = path.split("/").slice(0, -1).join("/")
    if (directory) await mkdir(directory, { ...appData, recursive: true })
    await writeTextFile(`${path}.download`, text, appData)
    await rename(`${path}.download`, path, {
      oldPathBaseDir: BaseDirectory.AppData,
      newPathBaseDir: BaseDirectory.AppData,
    })
  },

  getSpineAssets: folderPath => invoke("get_spine_assets", { folderPath }),
  getModBackgrounds: folderPath => invoke("get_mod_backgrounds", { folderPath }),

  getDatingAudio: hash => invoke("get_dating_audio", { hash }),
  getGameBackground: hash => invoke("get_game_background", { hash }),
  hasGameBackgrounds: hashes => invoke("has_game_backgrounds", { hashes }),
  getGameBackgroundCacheSize: () => invoke("get_game_background_cache_size"),
  clearGameBackgroundCache: () => invoke("clear_game_background_cache"),

  connectToManager: () => invoke("connect_to_bd2mm"),
  setModEnabledOnManager: (modName, enabled) => invoke("enable_mod_on_bd2mm", { modName, enabled }),

  async onManagerEvent(handler) {
    const unlisten = await Promise.all([
      listen<{ mods: ManagerMod[] }>("bd2mm::state", ({ payload }) => handler({ type: "state", mods: payload.mods })),
      listen("bd2mm::disconnected", () => handler({ type: "disconnected" })),
    ])
    return () => unlisten.forEach(stop => stop())
  },
} satisfies Platform

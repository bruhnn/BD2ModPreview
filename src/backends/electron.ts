import type { DragDropEvent, Platform } from "."

interface ElectronBridge {
  invoke(command: string, args?: Record<string, unknown>): Promise<{ ok: true; value: unknown } | { ok: false; error: unknown }>
  getPathForFile(file: File): string
}

declare global {
  interface Window {
    electron?: ElectronBridge
  }
}

//{ type, message }
async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const result = await window.electron!.invoke(command, args)
  if (!result.ok) throw result.error
  return result.value as T
}

export default {
  getVersion: () => call("get_version"),
  getUserLocale: () => call("get_user_locale"),
  getMachineId: () => call("get_machine_id"),
  getLaunchArgs: () => call("get_launch_args"),
  openUrl: url => call("open_url", { url }),

  showWindow: () => call("show_window"),
  isAlwaysOnTop: () => call("is_always_on_top"),
  setAlwaysOnTop: value => call("set_always_on_top", { value }),

  saveWindowState: async () => {},

  async onDragDrop(handler) {
    const hasFiles = (event: DragEvent) => !!event.dataTransfer?.types.includes("Files")
    const paths = (event: DragEvent) =>
      [...(event.dataTransfer?.files ?? [])].map(file => window.electron!.getPathForFile(file)).filter(Boolean)
    const at = (type: "over" | "drop", event: DragEvent): DragDropEvent =>
      ({ type, x: event.clientX, y: event.clientY, paths: type === "drop" ? paths(event) : [] })

    const over = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      handler(at("over", event))
    }
    const drop = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      handler(at("drop", event))
    }
    // relatedTarget is null only when the pointer leaves the window.
    const leave = (event: DragEvent) => {
      if (!event.relatedTarget) handler({ type: "leave" })
    }

    window.addEventListener("dragover", over)
    window.addEventListener("drop", drop)
    window.addEventListener("dragleave", leave)

    return () => {
      window.removeEventListener("dragover", over)
      window.removeEventListener("drop", drop)
      window.removeEventListener("dragleave", leave)
    }
  },

  pickFolder: () => call("pick_folder"),
  saveFile: (defaultName, filters, bytes) => call("save_file", { defaultName, filters, bytes }),
  readAppDataText: path => call("read_app_data_text", { path }),
  writeAppDataText: (path, text) => call("write_app_data_text", { path, text }),

  getSpineAssets: folderPath => call("get_spine_assets", { folderPath }),
  getModBackgrounds: folderPath => call("get_mod_backgrounds", { folderPath }),

  getDatingAudio: hash => call("get_dating_audio", { hash }),
  getGameBackground: hash => call("get_game_background", { hash }),
  hasGameBackgrounds: hashes => call("has_game_backgrounds", { hashes }),
  getGameBackgroundCacheSize: () => call("get_game_background_cache_size"),
  clearGameBackgroundCache: () => call("clear_game_background_cache"),

  connectToManager: () => Promise.reject(new Error("BD2MM connection is only supported on Windows")),
  setModEnabledOnManager: () => Promise.reject(new Error("BD2MM connection is only supported on Windows")),
  onManagerEvent: async () => () => {},
} satisfies Platform

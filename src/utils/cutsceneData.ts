import { platform } from "../backends"
import bundledIndex from "../data/cutscenes/index.json"
import type { Scene } from "../composables/useGameCutscene"
import { useLogger } from "../composables/useLogger"

const revisions: Record<string, number> = bundledIndex
const bundled = import.meta.glob<{ default: Scene }>("../data/cutscenes/[0-9]*.json")
const { logMessage } = useLogger()
let updating: Promise<void> | undefined

function validScene(data: any): data is Scene {
  return data && Number.isInteger(data.revision) && data.revision > 0 &&
    Number.isFinite(data.duration) && data.duration > 0 &&
    Array.isArray(data.nodes) && data.nodes.length > 0 &&
    data.nodes.every((node: any) => node && typeof node.path === "string" &&
      node.position && node.scale && node.size && node.pivot && node.anchorMin && node.anchorMax && node.color) &&
    Array.isArray(data.curves) && Array.isArray(data.tracks) && data.tracks.length > 0 &&
    data.tracks.every((track: any) => track && Number.isInteger(track.node) &&
      track.node >= 0 && track.node < data.nodes.length && Array.isArray(track.clips) &&
      track.clips.every((clip: any) => clip && typeof clip.name === "string" &&
        [clip.start, clip.duration, clip.clipIn, clip.speed].every(Number.isFinite)))
}

async function readSaved(id: string): Promise<Scene | null> {
  try {
    const text = await platform.readAppDataText(`cutscenes/${id}.json`)
    if (text === null) return null
    const data = JSON.parse(text)
    if (!validScene(data)) throw new Error("Invalid saved timeline")
    return data
  } catch (error) {
    logMessage(`Cutscene ${id}: could not read saved data: ${error}`, "warning")
    return null
  }
}

async function download(file: string, valid: (data: any) => boolean): Promise<any> {
  const sources = [
    `https://cdn.jsdelivr.net/gh/bruhnn/BD2ModPreview@main/src/data/cutscenes/${file}.json`,
    `https://raw.githubusercontent.com/bruhnn/BD2ModPreview/main/src/data/cutscenes/${file}.json`,
  ]
  for (const url of sources) {
    try {
      const response = await fetch(url, { cache: "no-cache", signal: AbortSignal.timeout(5000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (!valid(data)) throw new Error("Invalid data or revision")
      return data
    } catch (error) {
      logMessage(`Cutscene ${file}: ${new URL(url).hostname}: ${error}`, "warning")
    }
  }
  return null
}

export function updateCutscenes(): Promise<void> {
  return updating ??= (async () => {
    try {
      const index: Record<string, number> | null = await download("index", data =>
        data && typeof data === "object" && !Array.isArray(data) &&
        Object.entries(data).every(([id, revision]) => /^\d+$/.test(id) &&
          Number.isInteger(revision) && (revision as number) > 0),
      )
      if (!index) return
      let updated = 0
      for (const [id, revision] of Object.entries(index)) {
        const saved = await readSaved(id)
        if (Math.max(saved?.revision ?? 0, revisions[id] ?? 0) >= revision) continue
        const data = await download(id, data => validScene(data) && data.revision === revision)
        if (!data) continue
        try {
          await platform.writeAppDataText(`cutscenes/${id}.json`, JSON.stringify(data))
          updated++
        } catch (error) {
          logMessage(`Cutscene ${id}: could not save update: ${error}`, "warning")
        }
      }
      if (updated) logMessage(`Updated ${updated} game cutscene timelines`, "success")
    } catch (error) {
      logMessage(`Could not update game cutscenes: ${error}`, "warning")
    }
  })()
}

export async function loadCutscene(id: string): Promise<Scene | null> {
  if (!/^\d+$/.test(id)) return null
  const saved = await readSaved(id)
  if (saved && saved.revision >= (revisions[id] ?? 0)) return saved
  const load = bundled[`../data/cutscenes/${id}.json`]
  if (revisions[id] && load) return (await load()).default
  await updateCutscenes()
  return readSaved(id)
}

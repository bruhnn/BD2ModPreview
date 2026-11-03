import { computed, ref, shallowRef, watch } from "vue"
import { minigames, type MinigameAction, type MinigameDefinition } from "../data/minigames"
import { useMinigameAudio } from "./useMinigameAudio"
import type { SpinePlayer } from "../types/spine"

export function useMinigameInteractions() {
  const audio = useMinigameAudio()
  const definition = shallowRef<MinigameDefinition | null>(null)
  const enabled = ref(false)
  const character = ref("")
  const characters = ref<string[]>([])
  const fever = ref(false)
  const available = computed(() => definition.value !== null)
  const feverAvailable = computed(() => !!definition.value && animations.includes(definition.value.idle(character.value, true)))
  const pointers = new Map<number, { left: boolean; x: number; y: number; elapsed: number; held: boolean; slid: boolean }>()
  const uses = new Map<string, number>()
  let player: SpinePlayer | null = null
  let animations: string[] = []
  let previousAnimation = ""
  let previousLoop = true

  function load(value: SpinePlayer | null) {
    enabled.value = false
    cancel()
    player = value
    animations = value?.skeleton.data.animations.map((animation: { name: string }) => animation.name) ?? []
    definition.value = minigames.find(game => game.characters(animations).length > 0 &&
      game.reactions("tap", true, false).some(name => animations.includes(name)) &&
      game.reactions("tap", false, false).some(name => animations.includes(name))) ?? null
    characters.value = definition.value?.characters(animations) ?? []
    const currentAnimation = value?.animationState.getCurrent(0)?.animation.name
    character.value = characters.value.includes(currentAnimation) ? currentAnimation : characters.value[0] ?? ""
    fever.value = false
    uses.clear()
  }

  function reset() {
    cancel()
    if (!enabled.value || !player || !definition.value) return
    const name = definition.value.idle(character.value, fever.value && feverAvailable.value)
    player.animationState.clearTracks()
    player.skeleton.setToSetupPose()
    player.animationState.setAnimation(0, name, true)
    uses.clear()
    void audio.load(Object.values(definition.value.sounds ?? {}))
  }

  function play(action: MinigameAction, left: boolean) {
    if (!player || !definition.value) return
    const names = definition.value.reactions(action, left, fever.value && feverAvailable.value).filter(name => animations.includes(name))
    if (!names.length) return
    // Prefer less-used reactions, like the game.
    const max = Math.max(...names.map(name => uses.get(name) ?? 0))
    const lessUsed = names.filter(name => (uses.get(name) ?? 0) < max)
    const choices = lessUsed.length ? lessUsed : names
    const name = choices[Math.floor(Math.random() * choices.length)]
    uses.set(name, (uses.get(name) ?? 0) + 1)
    player.animationState.setAnimation(left ? 1 : 2, name, false)
    void audio.play(definition.value.sounds?.[fever.value && feverAvailable.value ? "fever" : action])
  }

  function pointerDown(event: PointerEvent) {
    if (!enabled.value || !player || event.button !== 0) return false
    const rect = player.canvas.getBoundingClientRect()
    const left = event.clientX < rect.left + rect.width / 2
    if ([...pointers.values()].some(pointer => pointer.left === left)) return true
    event.preventDefault()
    player.canvas.setPointerCapture(event.pointerId)
    pointers.set(event.pointerId, { left, x: event.clientX, y: event.clientY, elapsed: 0, held: false, slid: false })
    if (fever.value && feverAvailable.value) play("tap", left)
    return true
  }

  function pointerMove(event: PointerEvent) {
    const pointer = pointers.get(event.pointerId)
    if (!pointer) return false
    // Preview gestures; the game judges these against rhythm notes.
    if (!pointer.slid && !(fever.value && feverAvailable.value) && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) >= 20) {
      if (pointer.held) play("release", pointer.left)
      pointer.slid = true
      play("slide", pointer.left)
    }
    return true
  }

  function pointerUp(event: PointerEvent) {
    const pointer = pointers.get(event.pointerId)
    if (!pointer) return false
    if (!pointer.slid && !(fever.value && feverAvailable.value)) play(pointer.held ? "release" : "tap", pointer.left)
    pointers.delete(event.pointerId)
    if (player?.canvas.hasPointerCapture(event.pointerId)) player.canvas.releasePointerCapture(event.pointerId)
    return true
  }

  function cancel(pointerId?: number) {
    for (const [id, pointer] of pointers) {
      if (pointerId !== undefined && id !== pointerId) continue
      if (pointer.held && !pointer.slid) play("release", pointer.left)
      pointers.delete(id)
      if (player?.canvas.hasPointerCapture(id)) player.canvas.releasePointerCapture(id)
    }
  }

  function update(delta: number) {
    if (!enabled.value || (fever.value && feverAvailable.value)) return
    for (const pointer of pointers.values()) {
      pointer.elapsed += delta
      if (!pointer.held && !pointer.slid && pointer.elapsed >= 0.3) {
        pointer.held = true
        play("hold", pointer.left)
      }
    }
  }

  watch(enabled, value => {
    if (!player) return
    if (value && available.value) {
      const track = player.animationState.getCurrent(0)
      previousAnimation = track?.animation.name ?? ""
      previousLoop = track?.loop ?? true
      reset()
    } else {
      void audio.load([])
      cancel()
      player.animationState.clearTracks()
      player.skeleton.setToSetupPose()
      if (animations.includes(previousAnimation)) player.animationState.setAnimation(0, previousAnimation, previousLoop)
    }
  }, { flush: "sync" })
  watch([character, fever], reset, { flush: "sync" })

  return { available, enabled, character, characters, fever, feverAvailable, load, reset, cancel, update, pointerDown, pointerMove, pointerUp }
}

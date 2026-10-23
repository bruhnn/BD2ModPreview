import { ref } from "vue";
import { useLogger } from "./useLogger";
import type { SpinePlayer } from "../types/spine";
import supportedCutscenes from "../data/cutscenes/index.json";

type Scene = {
  duration: number
  nodes: {
    path: string
    parent: number
    active: boolean
    position: { x: number, y: number }
    scale: { x: number, y: number, z: number }
    size: { x: number, y: number }
    pivot: { x: number, y: number }
    anchorMin: { x: number, y: number }
    anchorMax: { x: number, y: number }
    color: { r: number, g: number, b: number, a: number }
    texture: string | null
    skeleton: boolean
    groupAlpha?: number
    ignoreParentGroups?: boolean
    asset?: string
    rotation?: number
    depth?: number
    quaternion?: { x: number, y: number, z: number, w: number }
    euler?: { x: number, y: number, z: number }
    defaultMix?: number
    mixes?: { fromName: string, toName: string, duration: number }[]
  }[]
  tracks: {
    node: number
    trackIndex?: number
    clips: {
      name: string
      start: number
      duration: number
      clipIn: number
      speed: number
      loop?: boolean
      settings?: {
        customDuration: number
        useBlendDuration: number
        mixDuration: number
        holdPrevious: number
        alpha: number
        attachmentThreshold: number
        drawOrderThreshold: number
        eventThreshold: number
        dontEndWithClip: number
        endMixOutDuration: number
      }
      blendIn?: number
      easeIn?: number
    }[]
  }[]
  curves: Curve[]
  assets?: Record<string, { scale: number }>
  activations?: { node: number, clips: { start: number, duration: number }[] }[]
}

const cutscenes = import.meta.glob<{ default: Scene }>("../data/cutscenes/[0-9]*.json");

declare const spine: any;

type Curve = { start?: number; end?: number; clipIn?: number; speed?: number; path: string | null; property: string; constant?: number; keys: { time: number; value: number; coefficients: number[] }[] };

export function useGameCutscene() {
  const { logMessage } = useLogger();
  const incomplete = ref(false);
  let scene: Scene | null = null
  const available = ref(false);
  const active = ref(false);
  let player: SpinePlayer | null = null;
  let skeletons = new Map<number, any>();
  let states = new Map<number, any>();
  let entries: any[] = [];
  let events: { time: number; start: boolean; track: number; clip: Scene["tracks"][number]["clips"][number] }[] = [];
  let eventIndex = 0;
  let animationTime = -1;
  let assetManagers: any[] = [];
  let generation = 0;
  let time = 0;

  function dispose() {
    generation++;
    scene = null
    available.value = false;
    incomplete.value = false;
    active.value = false;
    for (const manager of assetManagers) manager.dispose();
    assetManagers = [];
    skeletons.clear();
    states.clear();
    entries = [];
    events = [];
    animationTime = -1;
    player = null;
    time = 0;
  }

  async function load(value: SpinePlayer, filename: string) {
    dispose();
    const id = filename.match(/(?:^|[/\\])cutscene_char(\d+)(?:_[a-z])?\.(?:skel|json)(?:[?#]|$)/i)?.[1];
    if (!id || !supportedCutscenes.includes(id)) return;
    const request = generation;
    const loaded = await cutscenes[`../data/cutscenes/${id}.json`]();
    if (request !== generation) return;
    const data = new Map<string, any>([["", value.skeleton.data]]);
    const managers: any[] = [];
    for (const [key, asset] of Object.entries(loaded.default.assets ?? {})) {
      const base = `${import.meta.env.BASE_URL}cutscene-assets/${id}/${key}/`;
      const manager = new spine.AssetManager(value.sceneRenderer.context);
      try {
        manager.loadBinary(base + "skeleton.skel");
        manager.loadTextureAtlas(base + "skeleton.atlas");
        await manager.loadAll();
        const reader = new spine.SkeletonBinary(new spine.AtlasAttachmentLoader(manager.get(base + "skeleton.atlas")));
        reader.scale = asset.scale;
        data.set(key, reader.readSkeletonData(manager.get(base + "skeleton.skel")));
        managers.push(manager);
      } catch (error) {
        manager.dispose();
        if (request === generation) {
          logMessage(`Cutscene ${id}: skipping skeleton ${key}: ${error}`, "warning");
        }
      }
      if (request !== generation) {
        for (const manager of managers) manager.dispose();
        return;
      }
    }
    // Keep the timing, skip tracks whose skeleton is missing.
    const tracks = loaded.default.tracks.filter(track => data.has(loaded.default.nodes[track.node].asset ?? ""));
    if (!tracks.length || !tracks.every(track => track.clips.every(clip =>
      data.get(loaded.default.nodes[track.node].asset ?? "").findAnimation(clip.name)))) {
      for (const manager of managers) manager.dispose();
      return;
    }
    incomplete.value = tracks.length !== loaded.default.tracks.length;
    scene = { ...loaded.default, tracks };
    assetManagers = managers;
    player = value;
    for (const track of scene.tracks) {
      if (skeletons.has(track.node)) continue;
      const skeleton = new spine.Skeleton(data.get(scene.nodes[track.node].asset ?? ""));
      if (!scene.nodes[track.node].asset && value.skeleton.skin) skeleton.setSkin(value.skeleton.skin);
      skeletons.set(track.node, skeleton);
    }
    events = scene.tracks.flatMap((track, index) => track.clips.flatMap(clip => [
      { time: clip.start, start: true, track: index, clip },
      { time: clip.start + clip.duration, start: false, track: index, clip },
    ])).sort((a, b) => a.time - b.time || Number(b.start) - Number(a.start) || a.track - b.track || a.clip.duration - b.clip.duration);
    available.value = true;
  }

  function start() {
    if (!available.value || !scene) return
    time = 0;
    animationTime = -1;
    active.value = true;
  }

  function seek(value: number) {
    if (!scene) return
    time = Math.max(0, Math.min(value, scene.duration));
  }

  function update(delta: number, loop: boolean) {
    if (!active.value || !scene) return time
    time += delta;
    if (loop && time > scene.duration) {
      time %= scene.duration;
      animationTime = -1;
    } else time = Math.min(time, scene.duration);
    return time;
  }

  function applyAnimations() {
    if (!scene) return

    if (animationTime < 0 || time < animationTime) {
      states.clear();
      entries = [];
      eventIndex = 0;
      animationTime = 0;
      for (const [index, skeleton] of skeletons) {
        skeleton.setToSetupPose();
        const data = new spine.AnimationStateData(skeleton.data);
        data.defaultMix = scene.nodes[index].defaultMix ?? 0;
        for (const mix of scene.nodes[index].mixes ?? []) data.setMix(mix.fromName, mix.toName, mix.duration);
        states.set(index, new spine.AnimationState(data));
      }
    }
    // Replay clip boundaries when seeking, using the game's mixer settings.
    while (eventIndex < events.length && events[eventIndex].time <= time) {
      const event = events[eventIndex++];
      for (const [node, state] of states) {
        state.update(event.time - animationTime);
        state.apply(skeletons.get(node));
      }
      animationTime = event.time;
      const track = scene.tracks[event.track];
      const state = states.get(track.node);
      const skeleton = skeletons.get(track.node);
      const index = track.trackIndex ?? 0;
      const clip = event.clip;
      const settings = clip.settings;
      if (event.start) {
        const duration = settings?.customDuration
          ? settings.useBlendDuration ? Math.max(clip.blendIn ?? 0, clip.easeIn ?? 0) : settings.mixDuration
          : null;
        if (!state.getCurrent(index) && duration !== null && duration > 0) {
          state.setEmptyAnimation(index, 0);
          state.apply(skeleton);
        }
        const entry = state.setAnimation(index, clip.name, clip.loop ?? false);
        entry.trackTime = clip.clipIn * clip.speed;
        entry.timeScale = clip.speed;
        if (duration !== null) entry.mixDuration = duration;
        if (settings) {
          entry.alpha = settings.alpha;
          entry.holdPrevious = !!settings.holdPrevious;
          entry.attachmentThreshold = settings.attachmentThreshold;
          entry.drawOrderThreshold = settings.drawOrderThreshold;
          entry.eventThreshold = settings.eventThreshold;
        }
        entries[event.track] = { entry, settings };
      } else if (!track.clips.some(other => other.start <= event.time && other.start + other.duration > event.time)
        && state.getCurrent(index) === entries[event.track]?.entry) {
        const previous = entries[event.track].settings;
        if (!previous?.dontEndWithClip) {
          const duration = previous?.endMixOutDuration ?? 0;
          if (duration < 0) state.getCurrent(index).timeScale = 0;
          else state.setEmptyAnimation(index, duration);
        }
      }
      state.apply(skeleton);
    }
    for (const [node, state] of states) {
      state.update(time - animationTime);
      state.apply(skeletons.get(node));
    }
    animationTime = time;
  }

  function sample(curve: Curve) {
    if (curve.constant !== undefined) return curve.constant;
    const curveTime = (time - (curve.start ?? 0)) * (curve.speed ?? 1) + (curve.clipIn ?? 0);
    let key = curve.keys[0];
    for (const candidate of curve.keys) {
      if (candidate.time > curveTime) break;
      key = candidate;
    }
    if (!key) return 0;
    if (curve.property === "m_IsActive" || curveTime < key.time) return key.value;
    const dt = curveTime - key.time;
    const [a, b, c, d] = key.coefficients;
    return ((a * dt + b) * dt + c) * dt + d;
  }

  function draw() {
    if (!player || !active.value || !scene) return false
    applyAnimations();
    const nodes = scene.nodes.map(node => ({ ...node, position: { ...node.position }, scale: { ...node.scale },
      anchorMin: { ...node.anchorMin }, anchorMax: { ...node.anchorMax }, quaternion: { ...(node.quaternion ?? { x: 0, y: 0, z: 0, w: 1 }) }, euler: { ...(node.euler ?? { x: 0, y: 0, z: node.rotation ?? 0 }) }, groupAlpha: node.groupAlpha ?? 1, rotated: false, matrix: new spine.Matrix4(), localZ: null as number | null, localX: null as number | null, localY: null as number | null, pivot: { ...node.pivot }, size: { ...node.size }, color: { ...node.color } }));
    for (const curve of scene.curves) {
      const node = nodes.find(node => node.path === curve.path);
      if (!node || (curve.start !== undefined && time < curve.start) || (curve.end !== undefined && time > curve.end)) continue;
      const value = sample(curve);
      const axis = curve.property.endsWith('.x') ? 'x' : curve.property.endsWith('.y') ? 'y' : null;
      if (curve.property === 'm_Alpha') node.groupAlpha = value;
      else if (curve.property === 'm_IsActive') node.active = value >= 0.5;
      else if (curve.property.startsWith('m_Color.')) node.color[curve.property.slice(-1) as keyof typeof node.color] = value;
      else if (curve.property === 'm_LocalPosition.x') node.localX = value;
      else if (curve.property === 'm_LocalPosition.y') node.localY = value;
      else if (curve.property === 'm_LocalPosition.z') node.localZ = value;
      else if (axis && curve.property.startsWith('m_SizeDelta.')) node.size[axis] = value;
      else if (axis && curve.property.startsWith('m_AnchoredPosition.')) node.position[axis] = value;
      else if (axis && curve.property.startsWith('m_LocalScale.')) node.scale[axis] = value;
      else if (curve.property === 'm_LocalScale.z') node.scale.z = value;
      else if (curve.property.startsWith('localEulerAnglesRaw.')) {
        node.euler[curve.property.slice(-1) as keyof typeof node.euler] = value;
        node.rotated = true;
      } else if (curve.property.startsWith('m_LocalRotation.')) node.quaternion[curve.property.slice(-1) as keyof typeof node.quaternion] = value;
      else if (axis && curve.property.startsWith('m_AnchorMin.')) node.anchorMin[axis] = value;
      else if (axis && curve.property.startsWith('m_AnchorMax.')) node.anchorMax[axis] = value;
      else if (axis && curve.property.startsWith('m_Pivot.')) node.pivot[axis] = value;
    }
    for (const activation of scene.activations ?? []) {
      const node = nodes[activation.node];
      const visible = activation.clips.some(clip => time >= clip.start && time <= clip.start + clip.duration);
      node.active = visible;
    }
    for (const node of nodes) {
      const parent = nodes[node.parent];
      let x = node.localX ?? node.position.x;
      let y = node.localY ?? node.position.y;
      if (parent) {
        node.size.x += parent.size.x * (node.anchorMax.x - node.anchorMin.x);
        node.size.y += parent.size.y * (node.anchorMax.y - node.anchorMin.y);
        const ax = node.anchorMin.x + (node.anchorMax.x - node.anchorMin.x) * node.pivot.x;
        const ay = node.anchorMin.y + (node.anchorMax.y - node.anchorMin.y) * node.pivot.y;
        x = node.localX ?? (x + parent.size.x * (ax - parent.pivot.x));
        y = node.localY ?? (y + parent.size.y * (ay - parent.pivot.y));
        node.active &&= parent.active;
        if (!node.ignoreParentGroups) node.groupAlpha *= parent.groupAlpha;
      }
      if (node.rotated) {
        const rx = node.euler.x * Math.PI / 360, ry = node.euler.y * Math.PI / 360, rz = node.euler.z * Math.PI / 360;
        const sx = Math.sin(rx), cx = Math.cos(rx), sy = Math.sin(ry), cy = Math.cos(ry), sz = Math.sin(rz), cz = Math.cos(rz);
        // Unity applies Euler rotations in Z, X, Y order.
        node.quaternion = { x: cy * sx * cz + sy * cx * sz, y: sy * cx * cz - cy * sx * sz,
          z: cy * cx * sz - sy * sx * cz, w: cy * cx * cz + sy * sx * sz };
      }
      const q = node.quaternion, scale = node.scale;
      node.matrix.set([
        (1 - 2 * (q.y * q.y + q.z * q.z)) * scale.x, 2 * (q.x * q.y + q.w * q.z) * scale.x, 2 * (q.x * q.z - q.w * q.y) * scale.x, 0,
        2 * (q.x * q.y - q.w * q.z) * scale.y, (1 - 2 * (q.x * q.x + q.z * q.z)) * scale.y, 2 * (q.y * q.z + q.w * q.x) * scale.y, 0,
        2 * (q.x * q.z + q.w * q.y) * scale.z, 2 * (q.y * q.z - q.w * q.x) * scale.z, (1 - 2 * (q.x * q.x + q.y * q.y)) * scale.z, 0,
        x, y, node.localZ ?? node.depth ?? 0, 1,
      ]);
      if (parent) node.matrix = new spine.Matrix4().set(parent.matrix.values).multiply(node.matrix);
    }
    const renderer = player.sceneRenderer;
    const gl = renderer.context.gl;
    // Replace the normal preview frame using the same renderer and textures.
    gl.clearColor(player.bg.r, player.bg.g, player.bg.b, player.bg.a);
    gl.clear(gl.COLOR_BUFFER_BIT);
    renderer.begin();
    nodes.forEach((node, index) => {
      if (!node.active) return;
      const skeleton = skeletons.get(index);
      if (!skeleton) return;
      skeleton.x = 0;
      skeleton.y = 0;
      skeleton.scaleX = 1;
      skeleton.scaleY = 1;
      skeleton.color.set(node.color.r, node.color.g, node.color.b, node.color.a * node.groupAlpha);
      skeleton.updateWorldTransform();
      renderer.drawSkeleton(skeleton, player!.config.premultipliedAlpha, -1, -1, (vertices: number[], length: number, stride: number) => {
        for (let i = 0; i < length; i += stride) {
          const x = vertices[i], y = vertices[i + 1];
          vertices[i] = node.matrix.values[12] + x * node.matrix.values[0] + y * node.matrix.values[4];
          vertices[i + 1] = node.matrix.values[13] + x * node.matrix.values[1] + y * node.matrix.values[5];
        }
      });
    });
    renderer.end();
    return true;
  }

  return { available, active, incomplete, load, start, seek, update, draw, dispose, get duration() { return scene?.duration ?? 0 } };
}


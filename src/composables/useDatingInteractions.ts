import { computed, ref, shallowRef, watch } from "vue";
import type { SpinePlayer } from "../types/spine";
import { DatingPoint, DatingScene } from "../types/dating";
import { useDatingScenesStore } from "../stores/datingScenes";

declare const spine: any;

export function useDatingInteractions(
  onAnimation: (animation: string) => void = () => {},
) {
  const datingScenesStore = useDatingScenesStore();

  let currentDating: DatingScene | null = null;

  const group = shallowRef<DatingScene["groups"][number] | null>(null);

  const tools = computed(() => group.value?.tools ?? []);
  const tool = ref(0);

  const gauge = ref(0);
  const gaugeRange = computed(() =>
    group.value?.gauge.IsOn ? group.value.gauge.MinMaxScore : null,
  );

  let elapsed = 0;
  let hold: {
    point: DatingPoint;
    id: number;
    start: number;
    loopStarted: boolean;
    destination: number;
  } | null = null;
  const hidden = new Map<string, number>();
  const lastClick = new Map<string, number>();
  const available = ref(false);
  const isDating = ref(false);
  let skeletonFilename = "";
  const enabled = ref(false);
  const showPoints = ref(false);
  let player: SpinePlayer | null = null;
  let reaction: any = null;
  let drag: {
    point: DatingPoint;
    id: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    started: boolean;
  } | null = null;
  let transition: any = null;
  let previousPoint = "";
  const clicks = new Map<string, number>();

  function reset() {
    cancelHold();
    hidden.clear();
    lastClick.clear();
    cancelDrag();
    if (transition && player) {
      const next = transition.next?.animation.name;
      transition = null;
      if (next) {
        player.animationState.setAnimation(0, next, true);
        onAnimation(next);
      }
    }
    previousPoint = "";
    clicks.clear();
    if (
      player &&
      reaction &&
      player.animationState.getCurrent(1) === reaction
    ) {
      player.animationState.clearTrack(1);
      player.skeleton.setToSetupPose();
      player.animationState.apply(player.skeleton);
      player.skeleton.updateWorldTransform();
    }
    reaction = null;
  }

  watch(enabled, reset, { flush: "sync" });

  watch(() => datingScenesStore.scenes, () => load(player, skeletonFilename));

  function load(value: SpinePlayer | null, filename = "") {
    enabled.value = false;
    reset();

    player = value;
    skeletonFilename = filename;
    showPoints.value = false;

    const name = filename
      .match(/(?:^|[/\\])(illust_dating\d+)\.(?:skel|json)(?:[?#]|$)/i)?.[1]
      .toLowerCase();

    const scene = name ? (datingScenesStore.scenes[name] ?? null) : null;

    currentDating = scene;
    isDating.value = !!player && !!name;

    group.value = null;
    tool.value = 0;
    elapsed = 0;

    available.value = !!player && !!scene;
  }

  function points() {
    if (!enabled.value || !player) return [];

    refreshGroup();

    if (!group.value) return [];

    const exclusive = currentDating?.points.find(
      (p) =>
        p.hidden.exclusive && p.hidden.points.some((key) => hidden.has(key)),
    );

    return currentDating?.points.filter(
      (point) =>
        point.group === group.value!.id &&
        point.tool === tool.value &&
        (!exclusive || exclusive.hidden.points.includes(point.key)) &&
        (!currentDating?.points.some((p) =>
          p.hidden.points.includes(point.key),
        ) ||
          hidden.has(point.key)) &&
        (!point.gauge.IsOn ||
          (Math.round(gauge.value) >= point.gauge.InteractableMinMaxRange.x &&
            Math.round(gauge.value) <=
              point.gauge.InteractableMinMaxRange.y)) &&
        player!.skeleton.findBone(point.bone)?.active,
    );
  }

  function refreshGroup() {
    if (!player) return

    const animation = player.animationState.getCurrent(0)?.animation.name
    const next = currentDating?.groups.find((g) => g.animation === animation)

    if (!next || group.value === next) return

    hidden.clear()
    clicks.clear()

    group.value = next
    gauge.value = next.gauge.StartScore
    if (!next.keepTool || !next.tools.some((t) => t.id === tool.value)) {
      tool.value = next.tools[0]?.id ?? 0;
    }

    applyTool();
  }

  function applyTool() {
    const skin = tools.value.find((t) => t.id === tool.value)?.skin

    if (skin && player?.skeleton.data.findSkin(skin)) {
      player.skeleton.setSkinByName(skin)
      player.skeleton.setSlotsToSetupPose()
    }
  }

  function selectTool(value: number) {
    if (!tools.value.some((t) => t.id === value)) return

    reset()
    tool.value = value
    applyTool()
  }

  function addScore(value: number) {
    const config = group.value?.gauge

    if (!config?.IsOn) return

    const previous = Math.round(gauge.value)

    gauge.value = Math.max(
      config.MinMaxScore.x,
      Math.min(config.MinMaxScore.y, gauge.value + value),
    )

    const current = Math.round(gauge.value)

    const motions =
      current > previous
        ? [...config.MotionNameByScoreList].reverse()
        : config.MotionNameByScoreList
  
    const motion = motions.find((m) =>
      current > previous
        ? m.IsCanPlayWhenIncreaseScore &&
          previous < m.Score &&
          m.Score <= current
        : m.IsCanPlayWhenDecreaseScore &&
          current <= m.Score &&
          m.Score < previous,
    )

    if (motion?.MixAnimationName) {
      playReaction(motion.MixAnimationName)
    }
  }

  function reveal(point: DatingPoint) {
    const duration = reaction?.animation.duration ?? 0

    for (const key of point.hidden.points)
      hidden.set(key, elapsed + duration + point.hidden.duration)

    const parent = currentDating?.points.find((p) =>
      p.hidden.points.includes(point.key),
    )

    if (parent) {
      for (const key of parent.hidden.points) {
        hidden.set(
          key,
          elapsed +
            duration +
            (point.hidden.closeParent ? 0 : parent.hidden.duration),
        )
      }
    }
  }

  function cancelHold(release = true) {
    const current = hold
    hold = null
    
    if (current && player) {
      const parent = currentDating?.points.find((p) =>
        p.hidden.points.includes(current.point.key),
      )

      if (parent) {
        for (const key of parent.hidden.points) {
          if (hidden.get(key) === Infinity)
            hidden.set(key, elapsed + parent.hidden.duration);
        }
      }

      player.animationState.clearTrack(2)

      if (release && player.canvas.hasPointerCapture(current.id)) {
        player.canvas.releasePointerCapture(current.id)
      }
    }
  }

  function finishHold(success: boolean) {
    if (!hold || !player) return

    const point = hold.point
    const destination = hold.destination

    cancelHold()
    cancelDrag()

    if (success && point.nextGroup) {
      changeGroup(point, destination)
    } else {
      const animation = (success ? point.hold.success : point.hold.fail)[
        destination
      ]

      if (animation) playReaction(animation)

      if (point.gauge.IsOn)
        addScore(
          success
            ? point.gauge.LongPressSuccessScore
            : point.gauge.LongPressFailScore,
        )

      reveal(point)
    }
  }

  function position(event: PointerEvent) {
    const rect = player!.canvas.getBoundingClientRect()

    return player!.sceneRenderer.camera.screenToWorld(
      new spine.Vector3(
        ((event.clientX - rect.left) * player!.canvas.width) / rect.width,
        ((event.clientY - rect.top) * player!.canvas.height) / rect.height,
        0,
      ),
      player!.canvas.width,
      player!.canvas.height,
    )
  }

  function contains(corners: number[][], x: number, y: number) {
    let positive = false
    let negative = false

    for (let i = 0; i < corners.length; i++) {
      const a = corners[i], b = corners[(i + 1) % corners.length]
      const cross = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0])

      positive ||= cross > 0
      negative ||= cross < 0
    }

    return !(positive && negative)
  }

  function playReaction(animation: string) {
    if (!player?.skeleton.data.findAnimation(animation)) return

    const state = player!.animationState

    state.clearTrack(1)
    player!.skeleton.setToSetupPose()
    reaction = state.setAnimation(1, animation, false)
    reaction.mixDuration = 0
    state.apply(player!.skeleton)
    player!.skeleton.updateWorldTransform()
  }

  function pointerDown(event: PointerEvent) {
    if (!player || !enabled.value || event.button !== 0) return false
    if (drag || hold || transition) return true

    const world = position(event)

    for (const point of points()??[]) {
      const bone = player.skeleton.findBone(point.bone)
      const local = bone.worldToLocal({ x: world.x, y: world.y })
      
      if (!contains(point.corners, local.x, local.y)) continue
      
      const key = point.key

      // changing areas reset the previous areas click count

      if (previousPoint !== key) {
        clicks.delete(previousPoint)
      }

      previousPoint = key

      if (point.drag) {
        drag = {
          point,
          id: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          x: bone.x,
          y: bone.y,
          started: false,
        }

        player.canvas.setPointerCapture(event.pointerId)
      } else {
        if (
          point.clickMax > 1 &&
          elapsed - (lastClick.get(key) ?? 0) > point.clickReset
        ) {
          clicks.delete(key);

        }

        const count = clicks.get(key) ?? 0

        lastClick.set(key, elapsed)

        const index = point.random
          ? Math.floor(Math.random() * point.animations.length)
          : Math.min(count, point.animations.length - 1)

        clicks.set(key, count + 1)

        if (point.nextGroup && !point.hold.mode && count + 1 >= point.clickMax) {
          changeGroup(point)
        } else playReaction(point.animations[index])

        if (point.gauge.IsOn && point.gauge.Scores.length) {

          addScore(
            point.gauge.Scores[Math.min(count, point.gauge.Scores.length - 1)],
          )
        }

        reveal(point)

        if (point.hold.mode) {
          hold = {
            point,
            id: event.pointerId,
            start: elapsed,
            loopStarted: false,
            destination: 0,
          }

          const parent = currentDating?.points.find((p) =>
            p.hidden.points.includes(point.key),
          )

          if (parent) {
            for (const key of parent.hidden.points) {
              hidden.set(key, Infinity)
            }
          }
          
          player.canvas.setPointerCapture(event.pointerId)
        }
      }

      event.preventDefault()
      return true
    }
    return false
  }

  function pointerMove(event: PointerEvent) {
    if (!player || !drag || drag.id !== event.pointerId) return false;
    if (!drag.started) {
      if (
        Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 5
      )
        return true;
      drag.started = true;
      playReaction(drag.point.animations[0]);
    }
    const bone = player.skeleton.findBone(drag.point.bone);
    const world = position(event);
    if (drag.point.zone) {
      const zone = drag.point.zone;
      const parent = player.skeleton.findBone(zone.bone);
      const local = parent.worldToLocal({ x: world.x, y: world.y });
      const a = zone.corners[0],
        b = zone.corners[3],
        c = zone.corners[1];
      const ux = b[0] - a[0],
        uy = b[1] - a[1],
        vx = c[0] - a[0],
        vy = c[1] - a[1];
      const det = ux * vy - uy * vx;
      const u = Math.max(
        0,
        Math.min(1, ((local.x - a[0]) * vy - (local.y - a[1]) * vx) / det),
      );
      const v = Math.max(
        0,
        Math.min(1, ((local.y - a[1]) * ux - (local.x - a[0]) * uy) / det),
      );
      Object.assign(
        world,
        parent.localToWorld({
          x: a[0] + u * ux + v * vx,
          y: a[1] + u * uy + v * vy,
        }),
      );
    } else {
      const center = bone.parent.localToWorld({
        x: bone.data.x,
        y: bone.data.y,
      });
      const dx = world.x - center.x,
        dy = world.y - center.y;
      const distance = Math.hypot(dx, dy);
      if (distance > drag.point.radius) {
        world.x = center.x + (dx * drag.point.radius) / distance;
        world.y = center.y + (dy * drag.point.radius) / distance;
      }
    }
    const local = bone.parent.worldToLocal({ x: world.x, y: world.y });
    drag.x = local.x;
    drag.y = local.y;
    update();
    event.preventDefault();
    return true;
  }

  function cancelDrag() {
    const current = drag;
    drag = null;
    if (current && player?.canvas.hasPointerCapture(current.id))
      player.canvas.releasePointerCapture(current.id);
    if (current?.started && player) {
      player.skeleton.setToSetupPose();
      player.animationState.apply(player.skeleton);
      player.skeleton.updateWorldTransform();
    }
  }

  function pointerUp(event: PointerEvent) {
    if (hold?.id === event.pointerId) {
      finishHold(elapsed - hold.start >= hold.point.hold.time);
      cancelDrag();
      return true;
    }
    if (!drag || drag.id !== event.pointerId) return false;
    const current = drag;
    cancelDrag();
    if (current.started) playReaction(current.point.animations[1]);
    return true;
  }

  function update(delta = 0) {
    if (!player || !enabled.value) return;
    elapsed += delta;
    refreshGroup();
    for (const [key, until] of hidden)
      if (until <= elapsed) {
        hidden.delete(key);
        clicks.delete(key);
        const parent = currentDating?.points.find((p) =>
          p.hidden.points.includes(key),
        );
        if (parent?.hidden.reset) {
          cancelDrag();
          clicks.clear();
        }
        if (hold?.point.key === key) cancelHold();
        if (drag?.point.key === key) cancelDrag();
      }
    const config = group.value?.gauge;
    if (
      config?.IsOn &&
      gauge.value >= config.AutoDecreaseScoreMinMaxLimit.x &&
      gauge.value <= config.AutoDecreaseScoreMinMaxLimit.y
    ) {
      const value = Math.max(
        config.AutoDecreaseScoreMinMaxLimit.x,
        Math.min(
          config.AutoDecreaseScoreMinMaxLimit.y,
          gauge.value + config.AutoDecreaseScorePerSecond * delta,
        ),
      );
      addScore(value - gauge.value);
    }
    if (hold) {
      if (!hold.loopStarted && (!reaction || reaction.isComplete())) {
        const animation = hold.point.hold.loop[hold.destination];
        if (animation && player.skeleton.data.findAnimation(animation))
          player.animationState.setAnimation(2, animation, true);
        hold.loopStarted = true;
      }
      if (
        hold.point.hold.mode === 1 &&
        elapsed - hold.start >= hold.point.hold.time
      )
        finishHold(true);
    }
    if (!drag?.started) return;
    const bone = player.skeleton.findBone(drag.point.bone);
    bone.x = drag.x;
    bone.y = drag.y;
    player.skeleton.updateWorldTransform();
    const destinations = drag.point.destinations;
    if (!destinations.length) return;
    const collider = drag.point.collider.map(([x, y]) =>
      bone.localToWorld({ x, y }),
    );
    // The game checks collider overlap, not the mouse position.
    const destination = destinations.findIndex((region) => {
      if (!region) return false;
      const parent = player!.skeleton.findBone(region.bone);
      if (!parent) return false;
      const target = region.corners.map(([x, y]) =>
        parent.localToWorld({ x, y }),
      );
      for (const polygon of [target, collider]) {
        for (let i = 0; i < polygon.length; i++) {
          const a = polygon[i],
            b = polygon[(i + 1) % polygon.length];
          const x = a.y - b.y,
            y = b.x - a.x;
          const first = target.map((p) => p.x * x + p.y * y);
          const second = collider.map((p) => p.x * x + p.y * y);
          if (
            Math.max(...first) < Math.min(...second) ||
            Math.max(...second) < Math.min(...first)
          )
            return false;
        }
      }
      return true;
    });
    if (destination < 0) {
      if (hold?.point === drag.point) cancelHold(false);
      return;
    }
    const point = drag.point;
    if (point.hold.mode) {
      if (hold && hold.destination !== destination) cancelHold(false);
      if (!hold)
        hold = {
          point,
          id: drag.id,
          start: elapsed,
          loopStarted: false,
          destination,
        };
    } else changeGroup(point, destination);
  }

  function changeGroup(point: DatingPoint, destination = 0) {
    if (!player || !point.nextGroup) return;
    const idle = currentDating?.groups.find((g) => g.id === point.nextGroup);
    if (!idle || !player.skeleton.data.findAnimation(idle.animation)) return;
    cancelDrag();
    cancelHold();
    clicks.clear();
    hidden.clear();
    player.animationState.clearTrack(1);
    reaction = null;
    const motion = point.motions[destination];
    if (!motion || !player.skeleton.data.findAnimation(motion)) {
      player.animationState.setAnimation(0, idle.animation, true);
      onAnimation(idle.animation);
      return;
    }
    transition = player.animationState.setAnimation(0, motion, false);
    transition.mixDuration = 0;
    const next = player.animationState.addAnimation(0, idle.animation, true, 0);
    next.mixDuration = 0;
    next.listener = {
      start: () => {
        transition = null;
        onAnimation(idle.animation);
      },
    };
  }

  function draw() {
    if (!player || !showPoints.value || !enabled.value) return;
    const renderer = player.sceneRenderer;
    const color = new spine.Color(1, 0.8, 0.2, 0.85);
    const dragColor = new spine.Color(0.2, 0.75, 1, 0.85);
    renderer.begin();
    for (const point of points()??[]) {
      const bone = player.skeleton.findBone(point.bone);
      const corners = point.corners.map(([x, y]) =>
        bone.localToWorld({ x, y }),
      );
      for (let i = 0; i < 4; i++) {
        const a = corners[i],
          b = corners[(i + 1) % 4];
        renderer.line(a.x, a.y, b.x, b.y, point.drag ? dragColor : color);
      }
    }
    renderer.end();
  }

  return {
    isDating,
    available,
    enabled,
    showPoints,
    tools,
    tool,
    gauge,
    gaugeRange,
    selectTool,
    cancelHold,
    load,
    reset,
    pointerDown,
    pointerMove,
    pointerUp,
    cancelDrag,
    update,
    draw,
  };
}

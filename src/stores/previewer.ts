import { defineStore } from "pinia";
import { ref, computed, readonly } from "vue";
import { useLocalStorage } from "@vueuse/core";
import type { AnimationSequence, SpineSource } from "../types/spine";
import type { PreviewDropTarget } from "../composables/usePreviewDrag";
import { i18n } from "../i18n";

export type Position = {
  row: number;
  column: number;
};

export type PreviewBackground =
  | { type: "theme" }
  | {
      type: "color";
      color: string;
    }
  | {
      type: "image";
      path: string; // url too
    };

export interface Previewer {
  pos: Position;

  id: string;
  title: string;
  source: SpineSource | null;

  isLoading: boolean;

  settings: {
    currentAnimation: string | null;
    followGlobalAnimation: boolean;
    paused: boolean;
    loopAnimation: boolean;
    premultipliedAlpha: boolean;
    background: PreviewBackground;
  };

  allAnimations: string[];
}

export const usePreviewerStore = defineStore("previewer", () => {
  const savedSequences = useLocalStorage<Record<string, AnimationSequence[]>>("PREVIEW_SEQUENCES", {});

  const previewers = ref<Previewer[]>([]);
  
  const previewLimitReached = computed(() => previewers.value.length >= 12);
  
  const globalAnimation = ref("");
  const premultipliedAlpha = ref(false);
  const restartCount = ref(0);
  
  const paused = computed({
    get: () =>
      previewers.value.length > 0 &&
      previewers.value.every((p) => p.settings.paused),
    set: (value: boolean) =>
      previewers.value.forEach((p) => (p.settings.paused = value)),
  });


  const lastRow = computed(() => {
    if (previewers.value.length === 0) return 0;
    return Math.max(...previewers.value.map((p) => p.pos.row));
  });

  function openPreview(
    title: string,
    source: SpineSource | null = null,
    position?: Position | null,
  ): string | null {
    const empty = previewers.value.find(p => !p.source);
    if (source && empty && !position) {
      empty.title = title;
      empty.source = source;
      return empty.id;
    }

    if (previewLimitReached.value) return null;

    const id = crypto.randomUUID();

    const row = lastRow.value;
    const count = previewers.value.filter(p => p.pos.row === row).length;
    const pos = position ?? {
      row: count < 2 ? row : row + 1,
      column: count < 2 ? count : 0,
    };

    previewers.value.push({
      id,
      title,
      source,
      pos,

      isLoading: false,
      
      settings: {
        currentAnimation: null,
        followGlobalAnimation: true,
        paused: paused.value,
        loopAnimation: true,
        premultipliedAlpha: premultipliedAlpha.value,
        background: { type: "theme" },
      },
      
      allAnimations: [],
    });

    return id;
  }

  function openDroppedPreview(title: string, source: SpineSource, target: PreviewDropTarget) {
    const empty = target.previewId ? getPreview(target.previewId) : undefined;
    if (empty && !empty.source) {
      empty.title = title;
      empty.source = source;
      return;
    }
    const id = openPreview(title, source, { row: lastRow.value + 1, column: 0 });
    if (id) movePreview(id, target.row, target.column, target.newRow);
  }

  function closePreview(id: string): boolean {
    const index = previewers.value.findIndex((p) => p.id === id);
    if (index !== -1) {
      previewers.value.splice(index, 1);
      if (!previewers.value.length) openPreview(i18n.global.t("preview.newPreview"));
      return true;
    }
    return false;
  }

  function getPreview(id: string): Previewer | undefined {
    return previewers.value.find((p) => p.id === id);
  }

  function movePreview(
    id: string,
    row: number,
    column: number,
    newRow: boolean,
  ) {
    const preview = getPreview(id);
    if (!preview) return;
    const rows = [...new Set(previewers.value.map((p) => p.pos.row))]
      .sort((a, b) => a - b)
      .map((row) => ({
        row,
        previews: previewers.value
          .filter((p) => p.pos.row === row)
          .sort((a, b) => a.pos.column - b.pos.column),
      }));
    const source = rows.find((r) => r.row === preview.pos.row)!;
    const sourceIndex = source.previews.indexOf(preview);
    const target = rows.find((r) => r.row === row);
    source.previews.splice(sourceIndex, 1);

    if (newRow) {
      const index = rows.findIndex((r) => r.row >= row);
      rows.splice(index === -1 ? rows.length : index, 0, {
        row,
        previews: [preview],
      });
    } else if (target) {

      // target position was measured before removing the dragged preview
      if (source === target && sourceIndex < column) column--
      target.previews.splice(column, 0, preview)
    }

    rows
      .filter((r) => r.previews.length)
      .forEach((r, row) => {
        r.previews.forEach((p, column) => (p.pos = { row, column }));
      })
  }

  function changeAnimationForAll(animation: string): void {
    globalAnimation.value = animation;
    previewers.value.forEach((previewer) => {
      if (
        previewer.settings.followGlobalAnimation &&
        previewer.allAnimations.includes(animation)
      ) {
        previewer.settings.currentAnimation = animation;
      }
    })
  }

  function setPremultipliedAlpha(value: boolean): void {
    premultipliedAlpha.value = value;
    previewers.value.forEach((p) => (p.settings.premultipliedAlpha = value));
  }

  function setLoopAnimationForAll(value: boolean): void {
    previewers.value.forEach((p) => (p.settings.loopAnimation = value));
  }

  function setBackgroundColorForAll(color: string): void {
    previewers.value.forEach((p) => (p.settings.background = { type: "color", color }));
  }

  function setBackgroundImageForAll(path: string): void {
    previewers.value.forEach((p) => (p.settings.background = { type: "image", path }));
  }

  function resetBackgroundForAll(): void {
    previewers.value.forEach((p) => (p.settings.background = { type: "theme" }));
  }

  return {
    previewers: previewers,
    savedSequences: savedSequences,
    previewLimitReached: readonly(previewLimitReached),
    restartCount: readonly(restartCount),
    premultipliedAlpha: readonly(premultipliedAlpha),
    paused: readonly(paused),
    globalAnimation: readonly(globalAnimation),
    openPreview,
    openDroppedPreview,
    closePreview,
    getPreview,
    changeAnimationForAll,
    movePreview,
    setPremultipliedAlpha,
    setLoopAnimationForAll,
    setBackgroundColorForAll,
    setBackgroundImageForAll,
    resetBackgroundForAll,
  };
});

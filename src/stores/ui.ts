import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia'
import { ref, readonly, shallowRef } from 'vue'

import { getVersion } from '@tauri-apps/api/app';

export const useUIStore = defineStore('ui', () => {
  const controlsPosition = useLocalStorage<'floating' | 'sidebar'>('CONTROLS_POSITION', 'sidebar');

  const showControlsSidebar = useLocalStorage('SHOW_CONTROLS_SIDEBAR', false);

  const showControls = ref(false);

  const showLogs = ref(false)
  const showHistory = ref(false)

  const showWhatsNew = ref(false)

  async function shouldShowWhatsNew() {
    const dontShowWhatsNewForVersion = localStorage.getItem('DONT_SHOW_WHATS_NEW_FOR_VERSION');
    const currentVersion = await getVersion();
    showWhatsNew.value = !(dontShowWhatsNewForVersion && dontShowWhatsNewForVersion === currentVersion);
  }

  if (controlsPosition.value === 'sidebar') {
    showControls.value = showControlsSidebar.value;
  }

  function closeAllModals() {
    closeLogs()
    closeControls()
    closeHistory()
  }

  function openLogs() {
    showLogs.value = true
  }

  function closeLogs() {
    showLogs.value = false
  }

  function openHistory() {
    showHistory.value = true
  }

  function closeHistory() {
    showHistory.value = false
  }

  function openControls() {
    showControls.value = true
    if (controlsPosition.value === 'sidebar') {
      showControlsSidebar.value = true;
    }
  }

  function closeControls() {
    showControls.value = false
    if (controlsPosition.value === 'sidebar') {
      showControlsSidebar.value = false;
    }
  }

  async function closeWhatsNew() {
    showWhatsNew.value = false;

    localStorage.setItem('DONT_SHOW_WHATS_NEW_FOR_VERSION', await getVersion());
  }

  const setControlsToFloating = () => {
    controlsPosition.value = 'floating'
  }

  const setControlsToSidebar = () => {
    controlsPosition.value = 'sidebar'
  }

  const toggleControls = () => {
    showControls.value = !showControls.value;
    if (controlsPosition.value === 'sidebar') {
      showControlsSidebar.value = !showControlsSidebar.value;
    }
  }

  const language = useLocalStorage<string>('APP_LANGUAGE', 'en');

  return {
    controlsPosition: readonly(controlsPosition),
    setControlsToFloating,
    setControlsToSidebar,

    showControls: readonly(showControls),
    showLogs: readonly(showLogs),
    showHistory: readonly(showHistory),
    showWhatsNew: readonly(showWhatsNew),
    shouldShowWhatsNew,

    openControls,
    openLogs,
    openHistory,
    closeLogs,
    closeHistory,
    closeControls,
    closeAllModals,
    closeWhatsNew,

    toggleControls,

    
    language,
    setLanguage(newLanguage: string) {
      language.value = newLanguage;
    }
  }
})
import { show } from '@tauri-apps/api/app';
import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'

export const useUIStore = defineStore('ui', () => {
  const controlsPosition = useLocalStorage<'floating' | 'sidebar'>('CONTROLS_POSITION', 'sidebar');

  const showControlsSidebar = useLocalStorage('SHOW_CONTROLS_SIDEBAR', false);
  
  const showControls = ref(false);
  
  const showLogs = ref(false)
  const showHistory = ref(false) 

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

  return {
    controlsPosition: readonly(controlsPosition),
    setControlsToFloating,
    setControlsToSidebar,

    showControls: readonly(showControls),
    showLogs: readonly(showLogs), 
    showHistory: readonly(showHistory),

    openControls,
    openLogs,
    openHistory,
    closeLogs,
    closeHistory,
    closeControls,
    closeAllModals,

    toggleControls
  }
})
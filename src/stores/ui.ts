import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia'
import { ref, readonly, watch } from 'vue'

import { getVersion } from '@tauri-apps/api/app';
import { useI18n } from 'vue-i18n';
import { invoke } from '@tauri-apps/api/core';

export const useUIStore = defineStore('ui', () => {
  const { locale } = useI18n()

  const theme = useLocalStorage('APP_THEME', 'dark-3')
  const language = useLocalStorage<string>('APP_LANGUAGE', 'en_US')

  const machineId = ref<string | null>(null)

  async function loadMachineId() {
    if (!machineId.value) {
      machineId.value = await invoke<string>('get_machine_id')
    }
    return machineId.value
  }

  const isSettingsVisible = ref(false)
  const isLogsVisible = ref(false)
  const isHistoryVisible = ref(false)
  const isWhatsNewVisible = ref(false)

  async function shouldShowWhatsNew() {
    const dontShowWhatsNewForVersion = localStorage.getItem('DONT_SHOW_WHATS_NEW_FOR_VERSION')
    const currentVersion = await getVersion()

    isWhatsNewVisible.value = !(dontShowWhatsNewForVersion && dontShowWhatsNewForVersion === currentVersion)
  }

  function openSettings() {
    isSettingsVisible.value = true
  }

  function closeSettings() {
    isSettingsVisible.value = false
  }

  function openLogs() {
    isLogsVisible.value = true
  }

  function closeLogs() {
    isLogsVisible.value = false
  }

  function openHistory() {
    isHistoryVisible.value = true
  }

  function closeHistory() {
    isHistoryVisible.value = false
  }

  async function closeWhatsNew() {
    isWhatsNewVisible.value = false;

    localStorage.setItem('DONT_SHOW_WHATS_NEW_FOR_VERSION', await getVersion());
  }

  watch(theme, value => { document.documentElement.dataset.theme = value; }, { immediate: true });
  watch(language, value => {
    // Keep saved languages and older command-line arguments working.
    const previousCodes: Record<string, string> = { en: 'en_US', zh: 'zh_CN', ja: 'ja_JP', ko: 'ko_KR' }
    const code = previousCodes[value] ?? value.replace('-', '_')
    if (value !== code) language.value = code
    locale.value = code
  }, { immediate: true });

  return {
    machineId,
    loadMachineId,
    
    theme,
    language,

    isSettingsVisible: readonly(isSettingsVisible),
    isLogsVisible: readonly(isLogsVisible),
    isHistoryVisible: readonly(isHistoryVisible),
    isWhatsNewVisible: readonly(isWhatsNewVisible),

    shouldShowWhatsNew,
    openSettings,
    closeSettings,
    openLogs,
    openHistory,
    closeLogs,
    closeWhatsNew,
    closeHistory,

  }
})
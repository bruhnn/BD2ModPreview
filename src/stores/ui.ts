import { useIntervalFn, useLocalStorage, useTimestamp } from '@vueuse/core';
import { defineStore } from 'pinia'
import { computed, ref, readonly, watch } from 'vue'

import { useI18n } from 'vue-i18n';
import { platform } from '../backends';

export const useUIStore = defineStore('ui', () => {
  const { locale } = useI18n()

  const minigameAudio = useLocalStorage('MINIGAME_AUDIO', true)
  const datingAudio = useLocalStorage('DATING_AUDIO', true)
  const datingPointStyle = useLocalStorage('DATING_POINT_STYLE', { clickColor: '#ffffff', dragColor: '#ffffff', size: 100 }, { mergeDefaults: true })

  const theme = useLocalStorage('APP_THEME', 'dark-3')
  const language = useLocalStorage<string>('APP_LANGUAGE', 'en_US', { writeDefaults: false })

  async function loadLanguage() {
    if (localStorage.getItem('APP_LANGUAGE')) return
    try {
      const systemLocale = await platform.getUserLocale()
      const languages: Record<string, string> = { en: 'en_US', zh: 'zh_CN', ja: 'ja_JP', ko: 'ko_KR' }
      language.value = languages[systemLocale.toLowerCase().split(/[-_]/)[0]] ?? 'en_US'
    } catch (error) {
      console.error('Failed to load system language:', error)
    }
  }

  const machineId = ref<string | null>(null)
  const supporterCache = useLocalStorage('SUPPORTER_ACCESS', { machineId: '', expiresAt: 0, valid: false })
  const now = useTimestamp({ scheduler: callback => useIntervalFn(callback, 1000) })
  const isSupporter = computed(() => supporterCache.value.machineId === machineId.value &&
    supporterCache.value.expiresAt > now.value && supporterCache.value.valid)

  async function checkSupporter() {
    const id = await loadMachineId()

    const response = await fetch('https://shy-waterfall-2797.bruhnn.workers.dev/check', {
      headers: { 'X-Machine-ID': id },
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`Failed to check supporter access: ${response.status}`)
    const data = await response.json()
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
    supporterCache.value = {
      machineId: id,
      expiresAt: typeof data.expiresAt === 'number' ? Math.min(expiresAt, data.expiresAt) : expiresAt,
      valid: data.valid === true,
    }
  }

  async function loadMachineId() {
    if (!machineId.value) {
      machineId.value = await platform.getMachineId()
    }
    return machineId.value
  }

  const isSettingsVisible = ref(false)
  const isLogsVisible = ref(false)
  const isHistoryVisible = ref(false)
  const isWhatsNewVisible = ref(false)
  const isBackgroundsVisible = ref(false)
  const backgroundsTarget = ref<string | null>(null)

  async function shouldShowWhatsNew() {
    const dontShowWhatsNewForVersion = localStorage.getItem('DONT_SHOW_WHATS_NEW_FOR_VERSION')
    const currentVersion = await platform.getVersion()

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

  function openBackgrounds(previewId: string | null = null) {
    backgroundsTarget.value = previewId
    isBackgroundsVisible.value = true
  }

  function closeBackgrounds() {
    isBackgroundsVisible.value = false
  }

  function openWhatsNew() {
    isWhatsNewVisible.value = true
  }

  async function closeWhatsNew() {
    isWhatsNewVisible.value = false;

    localStorage.setItem('DONT_SHOW_WHATS_NEW_FOR_VERSION', await platform.getVersion());
  }

  watch(theme, value => { document.documentElement.dataset.theme = value; }, { immediate: true });
  watch(language, value => {
    const previousCodes: Record<string, string> = { en: 'en_US', zh: 'zh_CN', ja: 'ja_JP', ko: 'ko_KR' }
    const code = previousCodes[value] ?? value.replace('-', '_')
    if (value !== code) language.value = code
    locale.value = code
  }, { immediate: true });

  return {
    datingPointStyle,
    datingAudio,
    minigameAudio,
    machineId,
    loadMachineId,
    isSupporter,
    checkSupporter,
    
    theme,
    language,
    loadLanguage,

    isSettingsVisible: readonly(isSettingsVisible),
    isLogsVisible: readonly(isLogsVisible),
    isHistoryVisible: readonly(isHistoryVisible),
    isWhatsNewVisible: readonly(isWhatsNewVisible),
    isBackgroundsVisible: readonly(isBackgroundsVisible),
    backgroundsTarget: readonly(backgroundsTarget),

    shouldShowWhatsNew,
    openWhatsNew,
    openSettings,
    closeSettings,
    openLogs,
    openHistory,
    openBackgrounds,
    closeBackgrounds,
    closeLogs,
    closeWhatsNew,
    closeHistory,

  }
})
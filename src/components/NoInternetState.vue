<script
  setup
  lang="ts"
>
import { CloudOff, LoaderCircle, RefreshCw } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

const emits = defineEmits(['check-connection'])

defineProps<{
  isChecking: boolean
}>()

const { t } = useI18n({
})
</script>
<template>
  <div class="offline-state">
    <div class="offline-icon">
      <CloudOff class="connection-icon" />
    </div>

    <h3 class="offline-title">
      {{ t('error.noInternet.title') }}
    </h3>

    <p class="offline-description">
      {{ t('error.noInternet.message') }}
    </p>

    <button @click="emits('check-connection')" class="retry-button" :disabled="isChecking">
      <LoaderCircle v-if="isChecking" class="retry-spinner" />
      <RefreshCw v-else class="retry-icon" />
      {{ isChecking ? t('error.noInternet.checking') : t('common.retry') }}
    </button>
  </div>
</template>

<style scoped>
.offline-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  padding: 32px 24px;
  text-align: center;
  color: var(--text-secondary);
}

.offline-icon {
  margin-bottom: 24px;
}

.connection-icon {
  width: 48px;
  height: 48px;
}

.offline-title {
  font-size: 20px;
  line-height: 28px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.offline-description {
  margin-bottom: 24px;
  max-width: 448px;
  line-height: 1.625;
}

.retry-button {
  display: inline-flex;
  align-items: center;
  padding: 8px 24px;
  background: var(--surface-card);
  color: var(--text-primary);
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 200ms, color 200ms;
}

.retry-button:hover {
  background: var(--state-hover);
}

.retry-button:disabled {
  background: var(--surface-panel);
  cursor: not-allowed;
}

.retry-button:focus {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 50%, transparent);
}

.retry-icon,
.retry-spinner {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}

.retry-spinner {
  margin-left: -4px;
  animation: spin 1s linear infinite;
}

.spinner-track {
  opacity: .25;
}

.spinner-path {
  opacity: .75;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

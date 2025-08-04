<template>
  <div class="flex flex-col items-center justify-center h-full min-h-[400px] px-6 py-8 text-center text-slate-400">
    <div class="mb-6">
      <svg class="w-12 h-12" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
        <path
          d="M792-56 686-160H260q-92 0-156-64T40-380q0-77 47.5-137T210-594q3-8 6-15.5t6-16.5L56-792l56-56 736 736-56 56ZM260-240h346L284-562q-2 11-3 21t-1 21h-20q-58 0-99 41t-41 99q0 58 41 99t99 41Zm185-161Zm419 191-58-56q17-14 25.5-32.5T840-340q0-42-29-71t-71-29h-60v-80q0-83-58.5-141.5T480-720q-27 0-52 6.5T380-693l-58-58q35-24 74.5-36.5T480-800q117 0 198.5 81.5T760-520q69 8 114.5 59.5T920-340q0 39-15 72.5T864-210ZM593-479Z" />
      </svg>
    </div>

    <h3 class="text-xl font-semibold text-slate-200 mb-3">
      No Internet Connection
    </h3>

    <p class="text-slate-400 mb-6 max-w-md leading-relaxed">
      Character assets cannot be loaded without an internet connection. Please check your network and try again.
    </p>

    <button @click="checkConnection"
      class="inline-flex items-center px-6 py-2 bg-slate-700 hover:bg-slate-600 cursor-pointer disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      :disabled="isChecking">
      <svg v-if="isChecking" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
        </path>
      </svg>
      <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">
        </path>
      </svg>
      {{ isChecking ? 'Checking...' : 'Try Again' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emits = defineEmits(['check-connection'])

const isChecking = ref(false)

const checkConnection = async () => {
  isChecking.value = true

  try {
    await emits('check-connection')
  } catch (error) {
    console.error('Connection check failed:', error)
  }

  isChecking.value = false
}
</script>
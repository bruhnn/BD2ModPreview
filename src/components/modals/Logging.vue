<script setup lang="ts">
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
  TransitionRoot,
  TransitionChild
} from '@headlessui/vue'
import { useLogger } from '../../composables/useLogger';
import { useClipboard } from '@vueuse/core';

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(["close"])

const { logs, clearLogs } = useLogger()

const { copy } = useClipboard()

function handleCopy() {
  let stringLogs = (logs.value.map((item) => `${item.timestamp}  ${item.level.toUpperCase()}  ${item.message}`).join("\n"));
  copy(stringLogs);
}
</script>
<template>
  <TransitionRoot :show="show" as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
    leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
    <Dialog as="div" class="relative z-9999" @close="$emit('close')">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100"
        leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/30" />
      </TransitionChild>
      <div class="fixed inset-0 flex w-screen items-center justify-center">
        <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100" leave="ease-in duration-200" leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95">
          <DialogPanel class="flex flex-col max-w-4xl m-4 rounded bg-gray-800 p-4 max-h-[90vh]"
            :class="{ 'w-lg': logs.length == 0 }">
            <div class="flex flex-row justify-between mb-4 text-2xl text-gray-400">
              <DialogTitle class="font-semibold">
                Logs
              </DialogTitle>
              <div class="flex gap-2">
                <button @click="clearLogs"
                  class="border-0 inset-0 transition-colors duration-200 hover:text-gray-300 cursor-pointer outline-none">
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                    fill="currentColor">
                    <path
                      d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
                  </svg>
                </button>
                <button @click="handleCopy"
                  class="border-0 inset-0 transition-colors duration-200 hover:text-gray-300 cursor-pointer outline-none">
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                    fill="currentColor">
                    <path
                      d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z" />
                  </svg>
                </button>
                <button
                  class="border-0 inset-0 transition-colors duration-200 hover:text-gray-300 cursor-pointer outline-none"
                  @click="$emit('close')">
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                    fill="currentColor">
                    <path
                      d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                  </svg>
                </button>
              </div>
            </div>
            <DialogDescription class="flex flex-col gap-2 overflow-y-auto text-gray-200 px-4">
              <div v-if="logs.length > 0" ref="logsContent">
                <div v-for="log in logs" :key="log.timestamp" class="flex gap-2">
                  <span class="text-gray-500 font-mono">
                    {{ log.timestamp }}
                  </span>
                  <span :class="{
                    'text-blue-400': log.level === 'info',
                    'text-green-400': log.level === 'success',
                    'text-yellow-400': log.level === 'warning',
                    'text-red-400': log.level === 'error'
                  }" class="font-mono font-semibold inline-block w-16 text-center">
                    {{ log.level.toUpperCase() }}
                  </span>
                  <span class="flex-1 text-gray-200 break-all" :class="{
                    'text-red-300': log.level === 'error'
                  }">
                    {{ log.message }}
                  </span>
                </div>
              </div>
              <div v-else>
                <p class="text-gray-500 text-center">No logs available.</p>
              </div>
            </DialogDescription>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
<style scoped>
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #2d3748;
}

::-webkit-scrollbar-thumb {
  background-color: #718096;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: #a0aec0;
}

* {
  user-select: auto;
}
</style>
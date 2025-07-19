<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
  TransitionRoot
} from '@headlessui/vue'
import { useLogger } from '../logger';

defineProps({
  show: Boolean
})

const emit = defineEmits(["close"])

const { logs } = useLogger()
</script>
<template>
  <TransitionRoot :show="show" as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
    leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
    <Dialog as="div" class="relative z-50" @close="$emit('close')">
      <div class="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div class="fixed inset-0 flex w-screen items-center justify-center ">
        <DialogPanel class="flex flex-col max-w-xl rounded bg-gray-800 p-4 max-h-[90vh]">          
          <div class="flex flex-row justify-between mb-4 text-2xl text-gray-400">
            <DialogTitle class="font-semibold">
              Logs
            </DialogTitle>
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
          <DialogDescription class="flex flex-col gap-2 overflow-y-auto text-gray-200 px-4">
            <div v-for="log in logs" :key="log.timestamp" class="flex gap-2">
              <span class="text-gray-500">
                {{ log.timestamp }}
              </span>
              <span :class="{
                'text-blue-400': log.level === 'info',
                'text-green-400': log.level === 'success',
                'text-red-400': log.level === 'error'
              }" class="font-semibold">
                {{ log.level.toUpperCase() }}
              </span>
              <span class="text-gray-300 break-all">
                {{ log.message }}
              </span>
            </div>
          </DialogDescription>
        </DialogPanel>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
<style scoped>
::-webkit-scrollbar {
  width: 8px; /* Set the width of the scrollbar */
}

::-webkit-scrollbar-track {
  background: #2d3748; /* Corresponds to gray-800 */
}

::-webkit-scrollbar-thumb {
  background-color: #718096; /* Corresponds to gray-500 */
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: #a0aec0; /* Corresponds to gray-400 */
}
</style>
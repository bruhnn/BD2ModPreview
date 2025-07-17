<script setup lang="ts">
import { PropType, ref } from 'vue';

defineEmits([
  "show-logs",
  "select-folder"
])

export interface SpineError {
  type: string,
  title: string,
  message: string,
}

defineProps({
  error: Object as PropType<SpineError>,
})

</script>

<template>
  <div class="flex flex-col h-full items-center py-8">
    <div class="flex-1 flex flex-col items-center justify-center px-8">
      <div class="w-10 h-10 text-red-400">
        <svg class="h-full w-full" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960"
          width="24px" fill="currentColor">
          <path
            d="M109-120q-11 0-20-5.5T75-140q-5-9-5.5-19.5T75-180l370-640q6-10 15.5-15t19.5-5q10 0 19.5 5t15.5 15l370 640q6 10 5.5 20.5T885-140q-5 9-14 14.5t-20 5.5H109Zm69-80h604L480-720 178-200Zm302-40q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm0-120q17 0 28.5-11.5T520-400v-120q0-17-11.5-28.5T480-560q-17 0-28.5 11.5T440-520v120q0 17 11.5 28.5T480-360Zm0-100Z" />
        </svg>
      </div>
      <h2 class="text-1xl font-bold text-red-400 mt-4">
        {{ error?.title || "Something Went Wrong" }}
      </h2>
      <p class="text-gray-400 leading-relaxed font-medium mt-2">
        {{ error?.message }}
      </p>

      <div class="m-4 w-full flex justify-center">
        <slot name="action-button"></slot>
      </div>

      <div class="w-full justify-center flex gap-3">
        <button @click="$emit('select-folder')" class="flex-1 text-sm py-2 px-4 text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-md cursor-pointer">
          Select Folder
        </button>
        <button @click="$emit('show-logs')" class="flex-1 text-sm py-2 px-4 text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-md cursor-pointer">
          View Logs
        </button>
      </div>
    </div>

    <p class="text-xs">
      You can drag and drop too.
    </p>
  </div>
</template>

<style></style>
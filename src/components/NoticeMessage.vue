<script setup lang="ts">
import type { CsvFileNotice } from '../types'

defineProps<{
  notice: CsvFileNotice
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="notice dismissible-notice" :class="notice.status">
    <div>
      <strong>{{ notice.fileName }}</strong>
      <span>{{ notice.message }}</span>
      <small v-if="notice.detail">{{ notice.detail }}</small>
    </div>
    <button type="button" aria-label="Close notification" @click="emit('close')">x</button>
  </div>
</template>

<script setup lang="ts">
import type { PageDefinition } from '../types'

defineProps<{
  page: PageDefinition
}>()

const emit = defineEmits<{
  refresh: []
}>()
</script>

<template>
  <header class="topbar">
    <div>
      <div class="topbar-brand">
        <img src="/gai-logo.svg" alt="" aria-hidden="true" />
        <p class="eyebrow">Govt. Graphic Arts Institute</p>
      </div>
      <h1>{{ page.label }}</h1>
      <p>{{ page.description }}</p>
    </div>
    <button class="secondary-action" type="button" @click="emit('refresh')">Refresh</button>
  </header>
</template>

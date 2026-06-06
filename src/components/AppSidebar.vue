<script setup lang="ts">
import type { PageDefinition, PageKey } from '../types'

defineProps<{
  activePage: PageKey
  pages: PageDefinition[]
}>()

const emit = defineEmits<{
  'update:activePage': [page: PageKey]
}>()
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <img class="brand-logo" src="/gai-logo.svg" alt="Govt. Graphic Arts Institute logo" />
      <div>
        <strong>Graphic Arts Institute</strong>
        <small>Clearance management</small>
      </div>
    </div>

    <nav class="nav-list" aria-label="Admin pages">
      <button
        v-for="page in pages"
        :key="page.key"
        class="nav-item"
        :class="{ active: activePage === page.key }"
        type="button"
        @click="emit('update:activePage', page.key)"
      >
        <span>{{ page.label }}</span>
      </button>
    </nav>
  </aside>
</template>

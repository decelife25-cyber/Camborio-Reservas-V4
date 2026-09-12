<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <div v-if="$slots.header" class="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
      <slot name="header"></slot>
    </div>

    <div class="p-4" :class="bodyClass">
      <slot></slot>
    </div>

    <div v-if="$slots.footer" class="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  bodyClass?: string
}>()
</script>

<script setup lang="ts">
defineProps<{
  icon: any
  title: string
  collapsed?: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>

<template>
  <div class="border border-outline-variant rounded-lg overflow-hidden">
    <button
      @click="$emit('toggle')"
      class="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
    >
      <div class="flex items-center gap-2">
        <component :is="icon" class="w-4 h-4 text-primary" />
        <span>{{ title }}</span>
      </div>
      <svg
        class="w-4 h-4 text-muted-foreground transition-transform duration-200"
        :class="{ 'rotate-180': !collapsed }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <div v-if="!collapsed" class="px-4 pb-4 space-y-3">
      <slot />
    </div>
  </div>
</template>

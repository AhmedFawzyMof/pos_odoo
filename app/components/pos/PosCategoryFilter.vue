<script setup lang="ts">
import type { POSCategory } from "~/types/pos";

const props = defineProps<{
  categories: POSCategory[];
  activeCategoryId: number | null;
  horizontal?: boolean;
}>();

const emit = defineEmits<{
  select: [categoryId: number | null];
}>();
</script>

<template>
  <select
    v-if="horizontal"
    :value="activeCategoryId ?? ''"
    @change="emit('select', ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null)"
    class="bg-transparent border border-outline-variant/40 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
  >
    <option value="">كل المنتجات ({{ categories.reduce((s, c) => s + c.productsCount, 0) }})</option>
    <option
      v-for="cat in categories"
      :key="cat.id"
      :value="cat.id"
    >
      {{ cat.name }} ({{ cat.productsCount }})
    </option>
  </select>
  <div v-else class="space-y-1">
    <button
      @click="emit('select', null)"
      class="w-full text-right px-3 py-2 rounded-lg text-sm transition-all cursor-pointer"
      :class="
        activeCategoryId === null
          ? 'bg-primary text-white font-bold shadow-sm'
          : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
      "
    >
      <div class="flex items-center justify-between">
        <span>كل المنتجات</span>
        <span
          class="text-[11px] tabular-nums"
          :class="
            activeCategoryId === null
              ? 'text-white/70'
              : 'text-muted-foreground'
          "
        >
          {{ categories.reduce((s, c) => s + c.productsCount, 0) }}
        </span>
      </div>
    </button>
    <button
      v-for="cat in categories"
      :key="cat.id"
      @click="emit('select', cat.id)"
      class="w-full text-right px-3 py-2 rounded-lg text-sm transition-all cursor-pointer"
      :class="
        activeCategoryId === cat.id
          ? 'bg-primary/10 text-primary font-bold'
          : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
      "
    >
      <div class="flex items-center justify-between">
        <span>{{ cat.name }}</span>
        <span
          class="text-[11px] tabular-nums"
          :class="
            activeCategoryId === cat.id
              ? 'text-primary/60'
              : 'text-muted-foreground'
          "
        >
          {{ cat.productsCount }}
        </span>
      </div>
    </button>
  </div>
</template>



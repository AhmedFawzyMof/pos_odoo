<script setup lang="ts">
import { Search } from "@lucide/vue";

const searchQuery = defineModel<string>("searchQuery");
</script>

<template>
  <div class="p-6 border-b border-outline-variant">
    <div class="relative w-full lg:w-96">
      <Search
        class="absolute right-4 top-1/2 -translate-y-1/2 text-on-white-variant w-5 h-5"
      />
      <input
        v-model="searchQuery"
        class="w-full pr-12 pl-4 py-2.5 bg-white rounded-xl border-none focus:ring-2 focus:ring-primary text-body-md"
        placeholder="البحث عن سائق بالاسم أو الهاتف..."
        type="text"
      />
    </div>
  </div>
</template>

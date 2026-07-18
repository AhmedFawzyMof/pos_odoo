<script setup lang="ts">
import { UserPlus, RefreshCw } from "@lucide/vue";

defineProps<{
  status: string;
}>();

const emit = defineEmits<{
  (e: "add"): void;
  (e: "refresh"): void;
}>();
</script>

<template>
  <div
    class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white p-5 rounded-xl border border-outline-variant shadow-sm"
  >
    <h3 class="text-headline-md font-bold text-primary">
      إدارة العملاء والشركاء
    </h3>
    <div class="flex items-center gap-2">
      <button
        @click="emit('refresh')"
        class="p-2.5 rounded-full border border-outline-variant hover:bg-white transition-all active:scale-95 text-on-white-variant cursor-pointer flex items-center justify-center"
        title="تحديث البيانات"
      >
        <RefreshCw
          :class="{ 'animate-spin': status === 'pending' }"
          class="w-5 h-5"
        />
      </button>
      <button
        @click="emit('add')"
        class="bg-primary hover:bg-primary/95 text-white px-6 py-2.5 rounded-full flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer font-bold"
      >
        <UserPlus class="w-5 h-5" />
        إضافة عميل جديد
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { MessageSquareText } from "@lucide/vue";

const show = ref(false);

const note = defineModel<string>("note", { default: "" });
</script>

<template>
  <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
    <button
      @click="show = !show"
      class="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
    >
      <div class="flex items-center gap-2">
        <MessageSquareText class="w-4 h-4 text-blue-500" />
        <span>ملاحظات</span>
      </div>
      <span class="text-xs text-slate-400">{{ show ? "إخفاء" : "إضافة" }}</span>
    </button>
    <div v-if="show" class="px-4 pb-4">
      <textarea
        v-model="note"
        rows="3"
        placeholder="ملاحظات على الطلب..."
        class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
      />
    </div>
  </div>
</template>

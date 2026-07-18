<script setup lang="ts">
import { Search } from "@lucide/vue";

const searchQuery = defineModel<string>("searchQuery");
const filterType = defineModel<string>("filterType", { default: "الكل" });
const filterTier = defineModel<string>("filterTier", { default: "الكل" });
</script>

<template>
  <div
    class="p-6 border-b border-outline-variant flex flex-col lg:flex-row gap-4 items-center"
  >
    <div class="relative w-full lg:w-96">
      <Search
        class="absolute right-4 top-1/2 -translate-y-1/2 text-on-white-variant w-5 h-5"
      />
      <input
        v-model="searchQuery"
        class="w-full pr-12 pl-4 py-2.5 bg-white rounded-xl border-none focus:ring-2 focus:ring-primary text-body-md"
        placeholder="البحث عن عميل بالاسم أو الهاتف..."
        type="text"
      />
    </div>

    <div class="flex flex-wrap gap-3 w-full lg:w-auto">
      <div
        class="flex items-center gap-2 bg-white rounded-xl px-4 py-1.5 border border-outline-variant/30"
      >
        <span class="text-label-md text-on-white-variant">النوع:</span>
        <select
          v-model="filterType"
          class="bg-transparent border-none focus:ring-0 text-label-md font-bold text-on-white p-0 cursor-pointer"
        >
          <option value="الكل">الكل</option>
          <option value="فرد">فرد</option>
          <option value="B2B">شركة (B2B)</option>
        </select>
      </div>

      <div
        class="flex items-center gap-2 bg-white rounded-xl px-4 py-1.5 border border-outline-variant/30"
      >
        <span class="text-label-md text-on-white-variant">فئة الولاء:</span>
        <select
          v-model="filterTier"
          class="bg-transparent border-none focus:ring-0 text-label-md font-bold text-on-white p-0 cursor-pointer"
        >
          <option value="الكل">الكل</option>
          <option value="بلاتيني">بلاتيني</option>
          <option value="ذهبي">ذهبي</option>
          <option value="فضي">فضي</option>
        </select>
      </div>
    </div>
  </div>
</template>

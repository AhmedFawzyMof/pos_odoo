<script setup lang="ts">
import { Users, BadgeCheck, Building2, Star } from "@lucide/vue";
import type { CustomerMeta } from "~/types/customer";

defineProps<{
  totalItems: number;
  meta: CustomerMeta;
}>();
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    <div
      class="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm"
    >
      <div class="flex justify-between items-center mb-4">
        <span class="p-3 rounded-xl bg-primary/10 text-primary">
          <Users class="w-5 h-5" />
        </span>
      </div>
      <p class="text-on-white-variant text-label-md">إجمالي العملاء</p>
      <p class="text-headline-md font-bold mt-1">{{ totalItems }}</p>
    </div>

    <div
      class="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm"
    >
      <div class="flex justify-between items-center mb-4">
        <span
          class="p-3 rounded-xl bg-secondary-container text-on-secondary-container"
        >
          <BadgeCheck class="w-5 h-5" />
        </span>
      </div>
      <p class="text-on-white-variant text-label-md">نشطون مؤخراً</p>
      <p class="text-headline-md font-bold mt-1">{{ meta.activeRecent }}</p>
    </div>

    <div
      class="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm"
    >
      <div class="flex justify-between items-center mb-4">
        <span class="p-3 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed">
          <Building2 class="w-5 h-5" />
        </span>
      </div>
      <p class="text-on-white-variant text-label-md">شركات (B2B)</p>
      <p class="text-headline-md font-bold mt-1">{{ meta.totalB2B }}</p>
    </div>

    <div
      class="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm"
    >
      <div class="flex justify-between items-center mb-4">
        <span class="p-3 rounded-xl bg-primary-container/20 text-primary">
          <Star class="w-5 h-5" />
        </span>
      </div>
      <p class="text-on-white-variant text-label-md font-label-md">
        برنامج الولاء
      </p>
      <p class="text-headline-md font-bold mt-1">
        {{ meta.loyaltyCount }} عميل
      </p>
    </div>
  </div>
</template>

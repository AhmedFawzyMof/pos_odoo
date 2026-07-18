<script setup lang="ts">
import { Truck, Banknote, Wallet, AlertTriangle } from "@lucide/vue";

defineProps<{
  totalItems: number;
  totalPurchased: number;
  outstanding: number;
  overdue: number;
}>();
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    <div
      class="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm"
    >
      <div class="flex justify-between items-center mb-4">
        <span class="p-3 rounded-xl bg-primary/10 text-primary">
          <Truck class="w-5 h-5" />
        </span>
      </div>
      <p class="text-on-white-variant text-label-md">إجمالي الموردين</p>
      <p class="text-headline-md font-bold mt-1">{{ totalItems }}</p>
    </div>

    <div
      class="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm"
    >
      <div class="flex justify-between items-center mb-4">
        <span class="p-3 rounded-xl bg-primary-container/20 text-primary">
          <Banknote class="w-5 h-5" />
        </span>
      </div>
      <p class="text-on-white-variant text-label-md">إجمالي المشتريات</p>
      <p class="text-headline-md font-bold mt-1 text-primary">
        {{ totalPurchased.toLocaleString("en-US") }} ج.م
      </p>
    </div>

    <div
      class="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm"
    >
      <div class="flex justify-between items-center mb-4">
        <span class="p-3 rounded-xl bg-amber-500/20 text-amber-600">
          <Wallet class="w-5 h-5" />
        </span>
      </div>
      <p class="text-on-white-variant text-label-md">المبالغ المستحقة</p>
      <p class="text-headline-md font-bold mt-1 text-amber-600">
        {{ outstanding.toLocaleString("en-US") }} ج.م
      </p>
    </div>

    <div
      class="bg-white p-6 rounded-2xl border border-outline-variant shadow-sm"
    >
      <div class="flex justify-between items-center mb-4">
        <span class="p-3 rounded-xl bg-error/20 text-error">
          <AlertTriangle class="w-5 h-5" />
        </span>
      </div>
      <p class="text-on-white-variant text-label-md">المتأخرات</p>
      <p class="text-headline-md font-bold mt-1 text-error">
        {{ overdue.toLocaleString("en-US") }} ج.م
      </p>
    </div>
  </div>
</template>

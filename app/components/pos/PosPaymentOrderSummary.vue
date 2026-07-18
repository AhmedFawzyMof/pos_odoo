<script setup lang="ts">
import { useNumberFormat } from "~/composables/useNumberFormat";

const { formatNumber } = useNumberFormat();

defineProps<{
  subtotal: number
  discountAmount: number
  serviceFeeAmount: number
  grandTotal: number
}>()
</script>

<template>
  <div class="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
    <div class="flex justify-between text-slate-600">
      <span class="tabular-nums">{{
        formatNumber(subtotal)
      }} ج.م</span>
      <span>المجموع</span>
    </div>
    <div
      v-if="discountAmount > 0"
      class="flex justify-between text-red-600"
    >
      <span class="tabular-nums"
        >-{{ formatNumber(discountAmount) }} ج.م</span
      >
      <span>الخصم</span>
    </div>
    <div
      v-if="serviceFeeAmount > 0"
      class="flex justify-between text-amber-600"
    >
      <span class="tabular-nums"
        >+{{ formatNumber(serviceFeeAmount) }} ج.م</span
      >
      <span>رسوم إضافية</span>
    </div>
    <div class="flex justify-between text-base font-bold pt-2 border-t border-slate-200 text-slate-900">
      <span class="tabular-nums">{{
        formatNumber(grandTotal)
      }} ج.م</span>
      <span>الإجمالي</span>
    </div>
  </div>
</template>

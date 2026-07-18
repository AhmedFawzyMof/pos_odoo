<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { Percent } from "@lucide/vue";
import { usePosCartStore } from "~~/stores/pos-cart";
import { usePermissions } from "~/composables/usePermissions";

const props = defineProps<{
  autoExpand?: boolean;
}>();

const { can } = usePermissions();
const cart = usePosCartStore();

const show = ref(false);
const discountType = ref<"fixed" | "percent">("fixed");
const discountValue = ref(0);

watch(
  () => props.autoExpand,
  (val) => {
    if (val) {
      show.value = true;
      nextTick(() => {
        const input = document.querySelector<HTMLInputElement>(
          '[placeholder="0"], [placeholder="0.00"]',
        );
        input?.focus();
      });
    }
  },
  { immediate: true },
);

function applyDiscount() {
  cart.setOrderDiscount(discountValue.value, discountType.value);
}
</script>

<template>
  <div
    v-if="can('cashier.discount')"
    class="bg-white border border-slate-200 rounded-xl overflow-hidden"
  >
    <button
      @click="show = !show"
      class="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
    >
      <div class="flex items-center gap-2">
        <Percent class="w-4 h-4 text-red-500" />
        <span>خصم على الفاتورة</span>
      </div>
      <span class="text-xs text-slate-400">{{ show ? "إخفاء" : "إضافة" }}</span>
    </button>
    <div v-if="show" class="px-4 pb-4 space-y-3">
      <div class="flex gap-2">
        <button
          @click="discountType = 'fixed'"
          :class="[
            'flex-1 h-9 rounded-lg text-xs font-bold transition-all cursor-pointer',
            discountType === 'fixed'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
          ]"
        >
          قيمة ثابتة
        </button>
        <button
          @click="discountType = 'percent'"
          :class="[
            'flex-1 h-9 rounded-lg text-xs font-bold transition-all cursor-pointer',
            discountType === 'percent'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
          ]"
        >
          نسبة %
        </button>
      </div>
      <div class="relative">
        <input
          v-model.number="discountValue"
          @input="applyDiscount"
          type="number"
          min="0"
          step="0.01"
          :placeholder="discountType === 'fixed' ? '0.00' : '0'"
          class="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none tabular-nums"
        />
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          {{ discountType === "fixed" ? "ج.م" : "%" }}
        </span>
      </div>
    </div>
  </div>
</template>

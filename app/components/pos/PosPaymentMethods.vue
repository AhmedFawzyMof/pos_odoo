<script setup lang="ts">
import { computed } from "vue";
import { Banknote, CreditCard, Smartphone, Wallet, Trash2 } from "@lucide/vue";
import type { PaymentMethod } from "~/types/pos";
import { useNumberFormat } from "~/composables/useNumberFormat";

const props = defineProps<{
  paymentMethods: PaymentMethod[];
  grandTotal: number;
}>();

const localPaymentAllocations = defineModel<
  { methodId: number; amount: number; received?: number }[]
>("allocations", { default: [] });

const { formatNumber } = useNumberFormat();

const paymentMethodIcons: Record<string, any> = {
  Cash: Banknote,
  Card: CreditCard,
  "Credit Card": CreditCard,
  "Debit Card": CreditCard,
  "Vodafone Cash": Smartphone,
  PayPal: Smartphone,
  Wallet: Wallet,
};

const allocatedTotal = computed(() =>
  localPaymentAllocations.value.reduce((s, p) => s + p.amount, 0),
);

const remaining = computed(() =>
  Math.max(0, props.grandTotal - allocatedTotal.value),
);

const isFullyPaid = computed(
  () => remaining.value <= 0 && allocatedTotal.value > 0,
);

function getMethodIcon(method: PaymentMethod) {
  if (method.is_cash_count) return Banknote;
  const name = method.name.toLowerCase();
  if (name.includes("card") || name.includes("credit") || name.includes("debit"))
    return CreditCard;
  if (name.includes("vodafone") || name.includes("wallet") || name.includes("paypal") || name.includes("orange"))
    return Smartphone;
  return Wallet;
}

function selectPaymentMethod(method: PaymentMethod) {
  const existing = localPaymentAllocations.value.find(
    (p) => p.methodId === method.id,
  );
  if (existing) return;
  const amt = Math.max(0, props.grandTotal - allocatedTotal.value);
  localPaymentAllocations.value.push({
    methodId: method.id,
    amount: amt,
  });
}

function removePaymentAllocation(index: number) {
  localPaymentAllocations.value.splice(index, 1);
}

function updateAllocation(index: number, amount: number) {
  if (amount < 0) amount = 0;
  if (!localPaymentAllocations.value[index]) return;
  // Prevent setting amount to 0 if there's still remaining balance
  if (amount === 0 && remaining.value > 0) {
    amount = remaining.value;
  }
  localPaymentAllocations.value[index].amount = amount;
}

function updateReceived(index: number, received: number) {
  if (received < 0) received = 0;
  if (!localPaymentAllocations.value[index]) return;
  localPaymentAllocations.value[index].received = received;
}

function getChange(index: number) {
  const alloc = localPaymentAllocations.value[index];
  if (!alloc || !alloc.received) return 0;
  return Math.max(0, alloc.received - alloc.amount);
}

function findMethod(methodId: number) {
  return props.paymentMethods.find((m) => m.id === methodId);
}
</script>

<template>
  <div class="space-y-3">
    <h4 class="text-sm font-bold text-slate-700">طرق الدفع</h4>

    <div class="grid grid-cols-3 gap-2">
      <button
        v-for="method in paymentMethods"
        :key="method.id"
        @click="selectPaymentMethod(method)"
        :disabled="localPaymentAllocations.some((p) => p.methodId === method.id)"
        class="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        :class="
          localPaymentAllocations.some((p) => p.methodId === method.id)
            ? 'bg-primary/10 border-primary text-primary'
            : 'bg-white border-slate-200 text-slate-600 hover:border-primary/50 hover:text-primary'
        "
      >
        <component :is="getMethodIcon(method)" class="w-5 h-5" />
        {{ method.name }}
      </button>
    </div>

    <div v-if="localPaymentAllocations.length > 0" class="space-y-3">
      <div
        v-for="(alloc, index) in localPaymentAllocations"
        :key="alloc.methodId"
        class="bg-white border border-slate-200 rounded-xl p-4 space-y-3"
      >
        <div class="flex items-center justify-between">
          <button
            @click="removePaymentAllocation(index)"
            class="text-red-400 hover:text-red-600 transition-colors cursor-pointer"
          >
            <Trash2 class="w-4 h-4" />
          </button>
          <div class="flex items-center gap-2 text-sm font-bold text-slate-700">
            <component :is="getMethodIcon(findMethod(alloc.methodId)!)" class="w-4 h-4" />
            {{ findMethod(alloc.methodId)?.name }}
          </div>
        </div>
        <div class="space-y-1">
          <label class="block text-xs text-slate-500">المبلغ</label>
          <div class="relative">
            <input
              :value="alloc.amount"
              @input="
                updateAllocation(
                  index,
                  parseFloat(($event.target as HTMLInputElement).value) || 0,
                )
              "
              type="number"
              min="0"
              step="0.01"
              class="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
            />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">ج.م</span>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="localPaymentAllocations.length > 0"
      class="flex justify-between items-center p-3 bg-slate-50 rounded-lg text-sm"
    >
      <span
        class="tabular-nums font-bold"
        :class="remaining > 0 ? 'text-red-600' : 'text-emerald-600'"
      >
        {{
          formatNumber(remaining)
        }} ج.م
      </span>
      <span class="text-slate-600">المتبقي</span>
    </div>
  </div>
</template>

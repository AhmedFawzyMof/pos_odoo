<script setup lang="ts">
import { ref } from "vue";
import {
  X,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
} from "@lucide/vue";
import type { CashMovementResponse } from "~/types/pos";
import { useNumberFormat } from "~/composables/useNumberFormat";

const { formatNumber } = useNumberFormat();

const props = defineProps<{
  open: boolean;
  sessionId: number;
}>();

const emit = defineEmits<{
  "update:open": [val: boolean];
  "movement-completed": [];
}>();

type MovementType = "cash_in" | "cash_out";

const movementType = ref<MovementType>("cash_in");
const amount = ref<number | null>(null);
const reason = ref("");
const isSaving = ref(false);
const errorMessage = ref("");
const newBalance = ref<number | null>(null);

function closeModal() {
  if (isSaving.value) return;
  resetForm();
  emit("update:open", false);
}

function resetForm() {
  amount.value = null;
  reason.value = "";
  errorMessage.value = "";
  newBalance.value = null;
  movementType.value = "cash_in";
}

async function handleSubmit() {
  errorMessage.value = "";

  if (!amount.value || amount.value <= 0) {
    errorMessage.value = "يرجى إدخال مبلغ صحيح";
    return;
  }
  if (!reason.value.trim()) {
    errorMessage.value = "السبب مطلوب";
    return;
  }

  isSaving.value = true;

  const finalAmount =
    movementType.value === "cash_out"
      ? -Math.abs(amount.value)
      : Math.abs(amount.value);

  try {
    const res = await $fetch<CashMovementResponse>(
      "/api/pos/cash-movement",
      {
        method: "POST",
        body: {
          session_id: props.sessionId,
          amount: finalAmount,
          reason: reason.value.trim(),
        },
      },
    );

    if (res.success) {
      newBalance.value = res.new_balance;
      amount.value = null;
      reason.value = "";
      emit("movement-completed");
    }
  } catch (error: any) {
    errorMessage.value =
      error.statusMessage || "فشل تسجيل الحركة";
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-50 bg-white flex flex-col font-sans text-slate-800"
      dir="rtl"
    >
        <div
          class="p-6 pb-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <Wallet class="text-primary bg-primary/10 p-2 rounded-lg w-10 h-10" />
            <div>
              <h3 class="text-lg font-bold text-slate-900">
                حركات الخزنة
              </h3>
              <p class="text-xs text-slate-500">
                تسجيل إيداع أو سحب نقدي
              </p>
            </div>
          </div>
          <button
            @click="closeModal"
            class="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X class="w-6 h-6" />
          </button>
        </div>

        <div class="p-6 space-y-5 overflow-y-auto text-right max-w-7xl mx-auto w-full">
          <div
            v-if="errorMessage"
            class="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold flex items-center gap-2"
          >
            <AlertTriangle class="w-4 h-4 shrink-0" />
            {{ errorMessage }}
          </div>

          <div
            v-if="newBalance !== null"
            class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl"
          >
            <div class="flex items-center gap-2 text-emerald-700 mb-1">
              <CheckCircle class="w-5 h-5" />
              <span class="text-sm font-bold">تم تسجيل الحركة بنجاح</span>
            </div>
            <div class="text-emerald-800">
              <span class="text-xs">الرصيد الحالي للخزنة:</span>
              <span class="text-lg font-bold mr-2 tabular-nums">
                {{ formatNumber(newBalance) }}
              </span>
              <span class="text-xs">ج.م</span>
            </div>
          </div>

          <div class="flex gap-2">
            <button
              type="button"
              @click="movementType = 'cash_in'"
              :class="[
                'flex-1 h-11 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2',
                movementType === 'cash_in'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              ]"
            >
              <ArrowDownToLine class="w-4 h-4" />
              إيداع
            </button>
            <button
              type="button"
              @click="movementType = 'cash_out'"
              :class="[
                'flex-1 h-11 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2',
                movementType === 'cash_out'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              ]"
            >
              <ArrowUpFromLine class="w-4 h-4" />
              سحب
            </button>
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-600">
              المبلغ
            </label>
            <div class="relative">
              <input
                v-model.number="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                class="w-full h-11 bg-white border border-slate-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
              />
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                ج.م
              </span>
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-600">
              السبب <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="reason"
              rows="3"
              placeholder="اذكر سبب الإيداع أو السحب..."
              class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        <div
          class="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3"
        >
          <button
            type="button"
            @click="closeModal"
            class="h-11 px-5 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            @click="handleSubmit"
            :disabled="isSaving"
            class="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw v-if="isSaving" class="w-4 h-4 animate-spin" />
            <span>{{
              isSaving ? "جاري التسجيل..." : "تأكيد"
            }}</span>
          </button>
        </div>
    </div>
  </Transition>
</template>

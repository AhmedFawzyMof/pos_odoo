<script setup lang="ts">
import { ref, watch } from "vue";
import {
  X,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
  LogOut,
  ShoppingCart,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  Banknote,
} from "@lucide/vue";
import type { SessionSummary } from "~/types/pos";
import { usePermissions } from '~/composables/usePermissions'
import { useNumberFormat } from "~/composables/useNumberFormat";
const { can } = usePermissions()

const { formatNumber } = useNumberFormat();

const props = defineProps<{
  open: boolean;
  sessionId: number;
  configId: string;
}>();

const emit = defineEmits<{
  "update:open": [val: boolean];
  "session-closed": [];
}>();

const router = useRouter();

const summary = ref<SessionSummary | null>(null);
const loadingSummary = ref(false);
const summaryError = ref("");

const closingCash = ref<number | null>(null);
const isClosing = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const showForceConfirm = ref(false);
const draftCount = ref(0);

async function fetchSummary() {
  if (!props.sessionId) return;
  console.log("[POS] fetchSummary session_id:", props.sessionId);
  loadingSummary.value = true;
  summaryError.value = "";
  try {
    const res = await $fetch<{ success: boolean; summary: SessionSummary }>(
      "/api/pos/session-summary",
      { params: { session_id: props.sessionId } },
    );

    if (res.success) {
      console.log("[POS] fetchSummary success:", res.summary);
      summary.value = res.summary;
      closingCash.value = res.summary.cash_balance;
    } else {
      console.warn("[POS] fetchSummary not successful", res);
    }
  } catch (err: any) {
    console.error("[POS] fetchSummary error:", err);
    summaryError.value = err.message || err.statusMessage || "فشل تحميل ملخص الوردية";
  } finally {
    loadingSummary.value = false;
  }
}

function closeModal() {
  if (isClosing.value) return;
  resetForm();
  emit("update:open", false);
}

function resetForm() {
  summary.value = null;
  closingCash.value = null;
  errorMessage.value = "";
  successMessage.value = "";
  summaryError.value = "";
}

watch(
  () => props.open,
  (val) => {
    if (val) {
      fetchSummary();
    } else {
      resetForm();
    }
  },
);

async function handleCloseSession(force = false) {
  console.log("[POS] handleCloseSession called, force:", force, "closingCash:", closingCash.value);
  errorMessage.value = "";
  successMessage.value = "";

  if (closingCash.value === null || closingCash.value < 0) {
    console.warn("[POS] handleCloseSession invalid cash amount");
    errorMessage.value = "يرجى إدخال الرصيد الختامي";
    return;
  }

  isClosing.value = true;
  try {
    const res = await $fetch<{
      success: boolean;
      session: any;
      message: string;
    }>("/api/pos/session-control", {
      method: "POST",
      body: {
        config_id: parseInt(props.configId, 10),
        action: "close",
        opening_cash: closingCash.value,
        force_close: force,
      },
    });

    if (res.success) {
      console.log("[POS] handleCloseSession success:", res);
      successMessage.value = res.message || "تم إغلاق الوردية بنجاح";
    } else {
      console.warn("[POS] handleCloseSession not successful:", res);
    }
  } catch (err: any) {
    console.error("[POS] handleCloseSession error:", err);
    const draftCountVal = err.data?.data?.draft_count || err.data?.draft_count || 0;
    if (draftCountVal > 0 && !force) {
      console.log("[POS] handleCloseSession prompt force close, draftCount:", draftCountVal);
      draftCount.value = draftCountVal;
      showForceConfirm.value = true;
      errorMessage.value = "";
    } else {
      errorMessage.value = err.message || err.statusMessage || "فشل إغلاق الوردية";
    }
  } finally {
    isClosing.value = false;
  }
}

function successDone() {
  console.log("[POS] successDone - emitting session-closed");
  emit("session-closed");
  emit("update:open", false);
}

function totalCashMovements(): number {
  if (!summary.value) return 0;
  return summary.value.cash_movements.reduce((sum, m) => {
    return m.type === "cash_in" ? sum + m.amount : sum - m.amount;
  }, 0);
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
          class="p-6 pb-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0"
        >
          <div class="flex items-center gap-3">
            <div class="bg-red-500/10 p-2 rounded-lg">
              <LogOut class="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 class="text-lg font-bold text-slate-900">إغلاق الوردية</h3>
              <p class="text-xs text-slate-500">
                {{ summary?.session_name || "ملخص الجلسة" }}
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

        <div class="flex-1 overflow-y-auto p-6 space-y-5 text-right max-w-7xl mx-auto w-full">
          <div
            v-if="summaryError"
            class="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold flex items-center gap-2"
          >
            <AlertTriangle class="w-4 h-4 shrink-0" />
            {{ summaryError }}
          </div>

          <div
            v-if="errorMessage"
            class="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold flex items-center gap-2"
          >
            <AlertTriangle class="w-4 h-4 shrink-0" />
            {{ errorMessage }}
          </div>

          <div
            v-if="successMessage"
            class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl"
          >
            <div class="flex items-center gap-2 text-emerald-700 mb-1">
              <CheckCircle class="w-5 h-5" />
              <span class="text-sm font-bold">تم إغلاق الوردية بنجاح</span>
            </div>
            <p class="text-xs text-emerald-600">{{ successMessage }}</p>
          </div>

          <template v-if="!successMessage">
            <div v-if="loadingSummary" class="text-center py-8 text-slate-400">
              <RefreshCw class="w-8 h-8 animate-spin mx-auto mb-2" />
              <span class="text-xs">جاري تحميل ملخص الوردية...</span>
            </div>

            <template v-else-if="summary">
              <!-- Summary Cards -->
              <div class="grid grid-cols-2 gap-3">
                <div
                  class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center"
                >
                  <ShoppingCart class="w-6 h-6 text-blue-600 mx-auto mb-1" />
                  <div class="text-2xl font-bold text-blue-700 tabular-nums">
                    {{ summary.orders_count }}
                  </div>
                  <div class="text-xs text-blue-600">عدد الفواتير</div>
                </div>
                <div
                  class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center"
                >
                  <Wallet class="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                  <div class="text-2xl font-bold text-emerald-700 tabular-nums">
                    {{
                      formatNumber(summary.total_sales)
                    }}
                  </div>
                  <div class="text-xs text-emerald-600">إجمالي المبيعات</div>
                </div>
              </div>

              <div class="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div class="flex justify-between text-slate-600">
                  <span class="tabular-nums"
                    >{{
                      formatNumber(summary.opening_cash)
                    }}
                    ج.م</span
                  >
                  <span>رصيد البداية</span>
                </div>
                <div class="flex justify-between text-slate-600">
                  <span class="tabular-nums"
                    >{{
                      formatNumber(summary.cash_balance)
                    }}
                    ج.م</span
                  >
                  <span>الرصيد الحالي</span>
                </div>
                <div
                  class="flex justify-between pt-2 border-t border-slate-200"
                  :class="
                    totalCashMovements() >= 0
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  "
                >
                  <span class="tabular-nums"
                    >{{
                      formatNumber(totalCashMovements())
                    }}
                    ج.م</span
                  >
                  <span>صافي حركات الخزنة</span>
                </div>
              </div>

              <!-- Cash Movements -->
              <div v-if="summary.cash_movements.length > 0">
                <h4 class="text-sm font-bold text-slate-700 mb-2">
                  حركات الخزنة
                </h4>
                <div class="space-y-2">
                  <div
                    v-for="(movement, idx) in summary.cash_movements"
                    :key="idx"
                    class="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3"
                  >
                    <div class="flex items-center gap-2">
                      <ArrowDownToLine
                        v-if="movement.type === 'cash_in'"
                        class="w-4 h-4 text-emerald-600"
                      />
                      <ArrowUpFromLine v-else class="w-4 h-4 text-red-600" />
                      <span class="text-xs text-slate-500">{{
                        movement.reason
                      }}</span>
                    </div>
                    <span
                      class="text-sm font-bold tabular-nums"
                      :class="
                        movement.type === 'cash_in'
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      "
                    >
                      {{ movement.type === "cash_in" ? "+" : "-"
                      }}{{
                        formatNumber(Math.abs(movement.amount))
                      }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Closing Cash Input -->
              <div
                class="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2"
              >
                <label class="block text-xs font-bold text-amber-800">
                  الرصيد الختامي للصندوق
                </label>
                <div class="relative">
                  <input
                    v-model.number="closingCash"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    class="w-full h-11 bg-white border border-amber-300 rounded-lg px-3 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none tabular-nums"
                  />
                  <span
                    class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"
                  >
                    ج.م
                  </span>
                </div>
              </div>
            </template>
          </template>
        </div>

        <!-- Force close confirmation overlay -->
        <div
          v-if="showForceConfirm"
          class="absolute inset-0 z-10 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <div class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div class="bg-amber-100 p-3 rounded-full w-14 h-14 mx-auto flex items-center justify-center">
              <AlertTriangle class="w-7 h-7 text-amber-600" />
            </div>
            <div>
              <h4 class="text-base font-bold text-slate-900 mb-1">يوجد طلبات مسودة</h4>
              <p class="text-sm text-slate-600">
                يوجد {{ draftCount }} طلب لم يتم الدفع. الإغلاق القسري سيلغي هذه الطلبات.
              </p>
            </div>
            <div class="flex gap-3">
              <button
                @click="showForceConfirm = false"
                class="flex-1 h-11 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
              >
                رجوع
              </button>
              <button
                @click="handleCloseSession(true)"
                class="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                إغلاق مع الإلغاء
              </button>
            </div>
          </div>
        </div>

        <div
          class="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3"
        >
          <template v-if="successMessage">
            <button
              type="button"
              @click="successDone"
              class="h-11 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer"
            >
              تم
            </button>
          </template>
          <template v-else>
            <button
              type="button"
              @click="closeModal"
              :disabled="isClosing"
              class="h-11 px-5 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs cursor-pointer disabled:opacity-40"
            >
              إلغاء
            </button>
            <button
              type="button"
              @click="handleCloseSession()"
              :disabled="isClosing || loadingSummary || !summary"
              class="h-11 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              <RefreshCw v-if="isClosing" class="w-4 h-4 animate-spin" />
              <LogOut v-else class="w-4 h-4" />
              <span>{{
                isClosing ? "جاري الإغلاق..." : "تأكيد إغلاق الوردية"
              }}</span>
            </button>
          </template>
        </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import {
  X,
  RefreshCw,
  AlertTriangle,
  ShoppingCart,
  Wallet,
  Banknote,
  Printer,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle,
} from "@lucide/vue";
import type { SessionSummary, SessionDetail, SessionDetailProduct } from "~/types/pos";
import { useSessionPrint } from "~/composables/useSessionPrint";

const props = defineProps<{
  open: boolean;
  sessionId: number | null;
}>();

const emit = defineEmits<{
  "update:open": [val: boolean];
}>();

const summary = ref<SessionSummary | null>(null);
const detail = ref<SessionDetail | null>(null);
const loading = ref(false);
const error = ref("");

const { printShort, printFull } = useSessionPrint();

async function fetchData() {
  if (!props.sessionId) return;
  loading.value = true;
  error.value = "";
  summary.value = null;
  detail.value = null;
  try {
    const [summaryRes, detailRes] = await Promise.all([
      $fetch<{ success: boolean; summary: SessionSummary }>("/api/pos/session-summary", {
        params: { session_id: props.sessionId },
      }),
      $fetch<{ success: boolean; detail: SessionDetail }>("/api/pos/session-detail", {
        params: { session_id: props.sessionId },
      }),
    ]);
    if (summaryRes.success) {
      summary.value = summaryRes.summary;
    }
    if (detailRes.success) {
      detail.value = detailRes.detail;
    }
  } catch (e: any) {
    error.value = e.message || e.statusMessage || "فشل تحميل ملخص الوردية";
  } finally {
    loading.value = false;
  }
}

function closeModal() {
  emit("update:open", false);
}

function resetForm() {
  summary.value = null;
  detail.value = null;
  error.value = "";
}

function handlePrintShort() {
  if (!summary.value) return;
  printShort(summary.value, detail.value);
}

function handlePrintFull() {
  if (!summary.value) return;
  printFull(summary.value, detail.value);
}

watch(
  () => props.open,
  (val) => {
    if (val) {
      fetchData();
    } else {
      resetForm();
    }
  },
);

function fmt(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatTime(d: string): string {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(d: string): string {
  if (!d) return "";
  return `${formatDate(d)} ${formatTime(d)}`;
}

function getCashPayment() {
  if (!detail.value) return null;
  return detail.value.payments?.find((p) => p.cash) || null;
}

function getPaymentMethods() {
  if (!detail.value) return [];
  const methodMap = new Map<string, number>();
  for (const p of detail.value.payments || []) {
    const methodName = p.name?.split(" ")[0] || p.name;
    methodMap.set(methodName, (methodMap.get(methodName) || 0) + p.total);
  }
  return Array.from(methodMap.entries()).map(([name, total]) => ({ name, total }));
}

function getAllProducts(): SessionDetailProduct[] {
  if (!detail.value) return [];
  const all: SessionDetailProduct[] = [];
  for (const cat of detail.value.products) {
    for (const p of cat.products) {
      all.push(p);
    }
  }
  return all.sort((a, b) => b.base_amount - a.base_amount);
}

function getTotalQty(): number {
  return detail.value?.products_info?.qty || 0;
}

function getGrossSales(): number {
  if (!detail.value) return summary.value?.total_sales || 0;
  return (detail.value.products_info?.total || 0) + (detail.value.discount_amount || 0);
}

function getDiscountAmount(): number {
  return detail.value?.discount_amount || 0;
}

function getCashExpenses(): number {
  if (!summary.value) return 0;
  return summary.value.cash_movements
    .filter((m) => m.type === "cash_out")
    .reduce((s, m) => s + m.amount, 0);
}

function getRefundTotal(): number {
  return detail.value?.refund_info?.total || 0;
}

function getCashStatus(): { label: string; color: string } {
  const cashPayment = getCashPayment();
  if (!cashPayment) return { label: "---", color: "#64748b" };
  const diff = cashPayment.money_difference || 0;
  if (Math.abs(diff) < 0.01) return { label: "متطابقة", color: "#059669" };
  return { label: `غير متطابقة (${fmt(diff)} ج.م)`, color: "#dc2626" };
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
      <!-- Header -->
      <div class="p-6 pb-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div class="bg-blue-500/10 p-2 rounded-lg">
            <Wallet class="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900">ملخص الوردية</h3>
            <p class="text-xs text-slate-500">{{ summary?.session_name || "جاري التحميل..." }}</p>
          </div>
        </div>
        <button
          @click="closeModal"
          class="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-6 space-y-5 max-w-4xl mx-auto w-full">
        <!-- Error -->
        <div
          v-if="error"
          class="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold flex items-center gap-2"
        >
          <AlertTriangle class="w-4 h-4 shrink-0" />
          {{ error }}
        </div>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-12 text-slate-400">
          <RefreshCw class="w-8 h-8 animate-spin mx-auto mb-2" />
          <span class="text-xs">جاري تحميل ملخص الوردية...</span>
        </div>

        <template v-if="!loading && summary">
          <!-- Session Info -->
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2">
            <h4 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span>⏱️</span> معلومات الجلسة
            </h4>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div><span class="text-slate-500">اسم المستخدم:</span> <span class="font-semibold">{{ summary.user_name }}</span></div>
              <div><span class="text-slate-500">الفرع:</span> <span class="font-semibold">{{ summary.config_name }}</span></div>
              <div><span class="text-slate-500">المناوبة:</span> <span class="font-semibold">{{ summary.session_name }}</span></div>
              <div><span class="text-slate-500">الحالة:</span> <span class="font-semibold">{{ summary.session_state }}</span></div>
              <div class="col-span-2"><span class="text-slate-500">الفترة:</span> <span class="font-semibold">{{ formatDateTime(summary.start_at) }} إلى {{ formatDateTime(summary.stop_at) }}</span></div>
            </div>
          </div>

          <!-- KPI Cards -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <ShoppingCart class="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <div class="text-2xl font-bold text-blue-700 tabular-nums">{{ summary.orders_count }}</div>
              <div class="text-xs text-blue-600">عدد الفواتير</div>
            </div>
            <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <Wallet class="w-6 h-6 text-emerald-600 mx-auto mb-1" />
              <div class="text-2xl font-bold text-emerald-700 tabular-nums">{{ fmt(summary.total_sales) }}</div>
              <div class="text-xs text-emerald-600">صافي المبيعات</div>
            </div>
            <div class="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
              <Banknote class="w-6 h-6 text-purple-600 mx-auto mb-1" />
              <div class="text-2xl font-bold text-purple-700 tabular-nums">{{ fmt(summary.opening_cash) }}</div>
              <div class="text-xs text-purple-600">الرصيد الافتتاحي</div>
            </div>
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <Banknote class="w-6 h-6 text-amber-600 mx-auto mb-1" />
              <div class="text-2xl font-bold text-amber-700 tabular-nums">{{ fmt(summary.cash_balance) }}</div>
              <div class="text-xs text-amber-600">الرصيد الحالي</div>
            </div>
          </div>

          <!-- Cash Drawer Summary -->
          <div class="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
            <h4 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span>💰</span> ملخص درج النقدية (الخزينة)
            </h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-slate-500">الرصيد الافتتاحي:</span>
                <span class="font-semibold">{{ fmt(summary.opening_cash) }} ج.م</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">(+) النقد المستلم (المبيعات):</span>
                <span class="font-semibold text-emerald-600">{{ fmt(getCashPayment()?.total || 0) }} ج.م</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">(-) المصروفات/المرتجعات:</span>
                <span class="font-semibold text-red-600">{{ fmt(getCashExpenses() + getRefundTotal()) }} ج.م</span>
              </div>
              <div class="flex justify-between pt-2 border-t border-slate-200">
                <span class="font-bold text-slate-700">💵 النقد المتوقع في الدرج:</span>
                <span class="font-bold text-emerald-600">{{ fmt(getCashPayment()?.final_count || summary.cash_balance) }} ج.م</span>
              </div>
              <div v-if="getCashPayment()" class="flex justify-between">
                <span class="text-slate-500">النقد الفعلي:</span>
                <span class="font-semibold">{{ fmt(getCashPayment()?.money_counted || 0) }} ج.م</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">الحالة:</span>
                <span class="font-semibold" :style="{ color: getCashStatus().color }">{{ getCashStatus().label }}</span>
              </div>
            </div>
          </div>

          <!-- Sales & Financial Summary -->
          <div class="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
            <h4 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span>📈</span> ملخص المبيعات والمالية
            </h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-slate-500">إجمالي المبيعات (قبل الخصم):</span>
                <span class="font-semibold">{{ fmt(getGrossSales()) }} ج.م</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">(-) إجمالي الخصومات:</span>
                <span class="font-semibold text-red-600">{{ fmt(getDiscountAmount()) }} ج.م</span>
              </div>
              <div class="flex justify-between pt-2 border-t border-slate-200">
                <span class="font-bold text-slate-700">صافي المبيعات:</span>
                <span class="font-bold text-emerald-600 text-base">{{ fmt(summary.total_sales) }} ج.م</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">طرق الدفع:</span>
                <span class="font-semibold">
                  <template v-if="getPaymentMethods().length">
                    <span v-for="(pm, i) in getPaymentMethods()" :key="pm.name">
                      {{ i > 0 ? " / " : "" }}{{ pm.name === 'Cash' ? 'نقداً' : pm.name }} {{ fmt(pm.total) }} ج.م
                    </span>
                  </template>
                  <template v-else>---</template>
                </span>
              </div>
              <div v-if="detail?.discount_number" class="flex justify-between">
                <span class="text-slate-500">عدد الخصومات:</span>
                <span class="font-semibold">{{ detail.discount_number }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">إجمالي القطع المباعة:</span>
                <span class="font-semibold">{{ getTotalQty() }} قطعة</span>
              </div>
            </div>
          </div>

          <!-- Products Table -->
          <div v-if="getAllProducts().length > 0" class="bg-white border border-slate-200 rounded-xl p-5">
            <h4 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span>📦</span> تفاصيل المنتجات المباعة (الأعلى مبيعاً)
            </h4>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b-2 border-slate-200">
                    <th class="text-center py-2 px-2 text-slate-500 text-xs font-bold w-10">#</th>
                    <th class="text-right py-2 px-2 text-slate-500 text-xs font-bold">اسم المنتج</th>
                    <th class="text-center py-2 px-2 text-slate-500 text-xs font-bold w-20">الكمية</th>
                    <th class="text-left py-2 px-2 text-slate-500 text-xs font-bold w-28">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(product, idx) in getAllProducts()"
                    :key="product.product_id"
                    class="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td class="text-center py-2 px-2 text-slate-400">{{ idx + 1 }}</td>
                    <td class="text-right py-2 px-2 font-medium">{{ product.product_name }}</td>
                    <td class="text-center py-2 px-2 tabular-nums">{{ product.quantity }}</td>
                    <td class="text-left py-2 px-2 tabular-nums font-semibold">{{ fmt(product.base_amount) }} ج.م</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Cash Movements -->
          <div v-if="summary.cash_movements.length > 0" class="bg-white border border-slate-200 rounded-xl p-5">
            <h4 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span>🔄</span> حركات الخزنة
            </h4>
            <div class="space-y-2">
              <div
                v-for="(movement, idx) in summary.cash_movements"
                :key="idx"
                class="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3"
              >
                <div class="flex items-center gap-2">
                  <ArrowDownToLine v-if="movement.type === 'cash_in'" class="w-4 h-4 text-emerald-600" />
                  <ArrowUpFromLine v-else class="w-4 h-4 text-red-600" />
                  <span class="text-sm text-slate-600">{{ movement.reason }}</span>
                </div>
                <span
                  class="text-sm font-bold tabular-nums"
                  :class="movement.type === 'cash_in' ? 'text-emerald-600' : 'text-red-600'"
                >
                  {{ movement.type === "cash_in" ? "+" : "-" }}{{ fmt(Math.abs(movement.amount)) }}
                </span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Footer -->
      <div class="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
        <button
          type="button"
          @click="closeModal"
          class="h-11 px-5 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
        >
          إغلاق
        </button>
        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="handlePrintShort"
            :disabled="!summary || loading"
            class="h-11 px-5 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-2 cursor-pointer disabled:opacity-40"
          >
            <Printer class="w-4 h-4" />
            طباعة مختصرة
          </button>
          <button
            type="button"
            @click="handlePrintFull"
            :disabled="!summary || loading"
            class="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-2 cursor-pointer disabled:opacity-40"
          >
            <Printer class="w-4 h-4" />
            طباعة كاملة
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

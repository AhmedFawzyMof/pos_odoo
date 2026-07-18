<script setup lang="ts">
import { ref, computed } from "vue";
import {
  TrendingUp,
  Banknote,
  Wallet,
  Receipt,
  Filter,
  LoaderCircle,
  CloudOff,
  ArrowUpLeft,
  CheckCheck,
  AlertCircle,
  Send,
  XCircle,
  Landmark,
  X,
} from "@lucide/vue";
import type { VendorBill, VendorBillApiResponse } from "~/types/vendorBill";
import { usePermissions } from "~/composables/usePermissions";
import EditVendorBillModal from "~/components/vendor-bills/EditVendorBillModal.vue";

const route = useRoute();
const { canViewPage, can } = usePermissions();

if (import.meta.client) {
  if (!canViewPage(route.path)) {
    navigateTo('/')
  }
}

const now = new Date();
const defaultDateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
const defaultDateTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

const dateFrom = ref(defaultDateFrom);
const dateTo = ref(defaultDateTo);
const currentPage = ref(1);
const searchQuery = ref("");
const filterState = ref("");

const {
  data: apiResponse,
  status,
  error,
  refresh,
  pending,
} = useFetch<VendorBillApiResponse>("/api/vendor-bills", {
  query: {
    page: currentPage,
    search: searchQuery,
    status: filterState,
    date_from: dateFrom,
    date_to: dateTo,
  },
  watch: [currentPage, searchQuery, filterState, dateFrom, dateTo],
  transform: (response: any) => {
    if (!response.data) response.data = [];
    return response;
  },
});

const { data: kpiData } = useFetch("/api/kpi/dashboard", {
  query: { date_from: dateFrom, date_to: dateTo },
});

const billList = computed<VendorBill[]>(() => apiResponse.value?.data || []);
const totalPages = computed(() => apiResponse.value?.totalPages || 1);
const totalItems = computed(() => apiResponse.value?.totalItems || 0);

const totalVendorBills = computed(() =>
  billList.value.reduce((s, b) => s + b.amount_total, 0),
);

const totalPayable = computed(() =>
  billList.value
    .filter((b) => b.payment_state !== "paid")
    .reduce((s, b) => s + b.amount_residual, 0),
);

const overdueCount = computed(
  () => billList.value.filter((b) => b.payment_state === "overdue").length,
);

const unpaidCount = computed(
  () => billList.value.filter((b) => b.payment_state !== "paid").length,
);

const stateText = (state: string) => {
  const map: Record<string, string> = {
    draft: "مسودة",
    posted: "مرسل",
    paid: "مدفوع",
    cancel: "ملغي",
  };
  return map[state] || state;
};

const stateClass = (state: string) => {
  if (state === "paid") return "bg-emerald-100 text-emerald-800";
  if (state === "posted") return "bg-primary/10 text-primary";
  if (state === "draft") return "bg-slate-100 text-slate-600";
  if (state === "cancel") return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-600";
};

const paymentStateText = (state: string) => {
  const map: Record<string, string> = {
    paid: "مدفوع",
    not_paid: "غير مدفوع",
    overdue: "متأخر",
    in_payment: "قيد الدفع",
    partial: "مدفوع جزئياً",
  };
  return map[state] || state;
};

const paymentStateClass = (state: string) => {
  if (state === "paid") return "bg-emerald-100 text-emerald-800";
  if (state === "overdue") return "bg-red-100 text-red-800";
  if (state === "partial" || state === "in_payment")
    return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
};

const loadingAll = computed(() => pending.value);

const showToast = ref(false);
const toastMessage = ref("");
const toastType = ref<"success" | "error">("success");

function showToastMessage(message: string, type: "success" | "error") {
  toastMessage.value = message;
  toastType.value = type;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 3000);
}

const showEditModal = ref(false);
const editingBillId = ref<number | null>(null);

function openEditModal(bill: VendorBill) {
  editingBillId.value = bill.id;
  showEditModal.value = true;
}

const showPaymentModal = ref(false);
const payBillId = ref<number | null>(null);
const payAmount = ref(0);
const payDate = ref("");

function openPayModal(bill: VendorBill) {
  payBillId.value = bill.id;
  payAmount.value = bill.amount_residual;
  payDate.value = new Date().toISOString().slice(0, 10);
  showPaymentModal.value = true;
}

const postBill = async (billId: number) => {
  try {
    const res = await $fetch<{ success: boolean; message?: string }>(
      "/api/vendor-bills/status",
      { method: "POST", body: { bill_id: billId, status: "posted" } },
    );
    if (res.success) {
      showToastMessage(res.message || "تم ترحيل الفاتورة بنجاح", "success");
      refresh();
    } else {
      showToastMessage(res.message || "فشل ترحيل الفاتورة", "error");
    }
  } catch (e: any) {
    showToastMessage(
      e?.data?.statusMessage || e?.message || "خطأ في الاتصال بالخادم", "error",
    );
  }
};

const cancelBill = async (billId: number) => {
  try {
    const res = await $fetch<{ success: boolean; message?: string }>(
      "/api/vendor-bills/status",
      { method: "POST", body: { bill_id: billId, status: "cancel" } },
    );
    if (res.success) {
      showToastMessage(res.message || "تم إلغاء الفاتورة بنجاح", "success");
      refresh();
    } else {
      showToastMessage(res.message || "فشل إلغاء الفاتورة", "error");
    }
  } catch (e: any) {
    showToastMessage(
      e?.data?.statusMessage || e?.message || "خطأ في الاتصال بالخادم", "error",
    );
  }
};

const submitPayment = async () => {
  if (!payBillId.value || payAmount.value <= 0) return;
  try {
    const res = await $fetch<{ success: boolean; message?: string }>(
      "/api/vendor-bills/payment",
      {
        method: "POST",
        body: {
          bill_id: payBillId.value,
          amount: payAmount.value,
          payment_date: payDate.value,
        },
      },
    );
    if (res.success) {
      showToastMessage(res.message || "تم تسجيل الدفعة بنجاح", "success");
      showPaymentModal.value = false;
      refresh();
    } else {
      showToastMessage(res.message || "فشل تسجيل الدفعة", "error");
    }
  } catch (e: any) {
    showToastMessage(
      e?.data?.statusMessage || e?.message || "خطأ في الاتصال بالخادم", "error",
    );
  }
};
</script>

<template>
  <div class="space-y-8 max-w-7xl mx-auto">
    <div
      v-if="loadingAll && billList.length === 0"
      class="h-[calc(100vh-200px)] flex items-center justify-center"
    >
      <div class="flex flex-col items-center gap-3 text-on-white-variant">
        <LoaderCircle class="w-8 h-8 animate-spin text-primary" />
        <span class="text-[13px]">جاري تحميل فواتير الموردين...</span>
      </div>
    </div>

    <template v-else>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-headline-lg font-bold text-on-white">
            فواتير الموردين
          </h1>
          <p class="text-on-white-variant text-label-md">
            إدارة فواتير الشراء والمستحقات للموردين
          </p>
        </div>
        <div class="flex gap-2">
          <button
            @click="refresh"
            class="px-4 py-2 border border-outline-variant rounded-lg font-bold hover:bg-white-low cursor-pointer"
          >
            تحديث
          </button>
        </div>
      </div>

      <!-- Date Filter -->
      <div
        class="flex items-center gap-4 bg-white border border-outline-variant rounded-xl p-4"
      >
        <Filter class="w-5 h-5 text-on-white-variant" />
        <div class="flex items-center gap-2">
          <label class="text-label-md text-on-white-variant">من</label>
          <input
            v-model="dateFrom"
            type="date"
            class="h-10 px-3 border border-outline-variant rounded-lg text-sm"
          />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-label-md text-on-white-variant">إلى</label>
          <input
            v-model="dateTo"
            type="date"
            class="h-10 px-3 border border-outline-variant rounded-lg text-sm"
          />
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="bg-white border border-outline-variant rounded-xl p-6">
          <div class="flex items-center gap-3 mb-2">
            <div
              class="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary"
            >
              <Receipt class="w-6 h-6" />
            </div>
          </div>
          <p class="text-on-white-variant text-label-md">
            فواتير الموردين (إجمالي)
          </p>
          <h3 class="text-price-display font-bold text-primary">
            {{ totalVendorBills.toLocaleString("en-US") }} ج.م
          </h3>
        </div>

        <div class="bg-white border border-outline-variant rounded-xl p-6">
          <div class="flex items-center gap-3 mb-2">
            <div
              class="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-600"
            >
              <Wallet class="w-6 h-6" />
            </div>
          </div>
          <p class="text-on-white-variant text-label-md">المستحق للموردين</p>
          <h3 class="text-price-display font-bold text-amber-600">
            {{ totalPayable.toLocaleString("en-US") }} ج.م
          </h3>
        </div>

        <div class="bg-white border border-outline-variant rounded-xl p-6">
          <div class="flex items-center gap-3 mb-2">
            <div
              class="w-10 h-10 rounded-lg bg-error/20 flex items-center justify-center text-error"
            >
              <Banknote class="w-6 h-6" />
            </div>
          </div>
          <p class="text-on-white-variant text-label-md">الفواتير المتأخرة</p>
          <h3 class="text-price-display font-bold text-error">
            {{ overdueCount }}
          </h3>
        </div>

        <div class="bg-white border border-outline-variant rounded-xl p-6">
          <div class="flex items-center gap-3 mb-2">
            <div
              class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-on-white-variant"
            >
              <TrendingUp class="w-6 h-6" />
            </div>
          </div>
          <p class="text-on-white-variant text-label-md">غير المسددة</p>
          <h3 class="text-price-display font-bold text-on-white">
            {{ unpaidCount }}
          </h3>
        </div>
      </div>

      <div
        v-if="status === 'error'"
        class="bg-error/10 border border-error text-error p-6 rounded-2xl text-center"
      >
        <CloudOff class="w-10 h-10 mb-2 inline-block" />
        <p class="font-bold">فشل الاتصال بالخادم</p>
        <button
          @click="refresh"
          class="mt-4 px-6 py-2 bg-error text-on-error rounded-full font-bold cursor-pointer"
        >
          إعادة المحاولة
        </button>
      </div>

      <!-- Search & Filter -->
      <div class="flex gap-4">
        <input
          v-model="searchQuery"
          class="flex-1 h-11 px-4 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
          placeholder="بحث برقم الفاتورة أو اسم المورد..."
          type="text"
        />
        <select
          v-model="filterState"
          class="h-11 px-3 bg-white border border-outline-variant rounded-lg text-sm cursor-pointer min-w-[140px]"
        >
          <option value="">جميع حالات الدفع</option>
          <option value="not_paid">غير مدفوع</option>
          <option value="paid">مدفوع</option>
          <option value="overdue">متأخر</option>
          <option value="partial">مدفوع جزئياً</option>
        </select>
      </div>

      <!-- Bills Table -->
      <div
        class="bg-white border border-outline-variant rounded-xl overflow-hidden"
      >
        <div
          v-if="billList.length === 0"
          class="p-12 text-center text-on-white-variant"
        >
          <p class="font-bold">لا توجد فواتير موردين في هذه الفترة</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-right border-collapse">
            <thead class="bg-white-low text-on-white-variant">
              <tr>
                <th class="p-4 text-label-md font-bold">رقم الفاتورة</th>
                <th class="p-4 text-label-md font-bold">المورد</th>
                <th class="p-4 text-label-md font-bold">تاريخ الفاتورة</th>
                <th class="p-4 text-label-md font-bold">تاريخ الاستحقاق</th>
                <th class="p-4 text-label-md font-bold">الإجمالي</th>
                <th class="p-4 text-label-md font-bold">المتبقي</th>
                <th class="p-4 text-label-md font-bold">حالة الدفع</th>
                <th class="p-4 text-label-md font-bold">الحالة</th>
                <th class="p-4 text-label-md font-bold">الإجراءات</th>
              </tr>
            </thead>
            <tbody
              class="divide-y divide-outline-variant/45 text-body-md text-on-white"
            >
              <tr
                v-for="bill in billList"
                :key="bill.id"
                class="hover:bg-primary/5 transition-colors"
              >
                <td class="p-4 font-bold">{{ bill.name }}</td>
                <td class="p-4">{{ bill.partner_id?.[1] || "-" }}</td>
                <td class="p-4 text-on-white-variant">
                  {{ bill.invoice_date || "-" }}
                </td>
                <td class="p-4 text-on-white-variant">
                  {{ bill.invoice_date_due || "-" }}
                </td>
                <td class="p-4 font-bold">
                  {{ bill.amount_total.toLocaleString("en-US") }} ج.م
                </td>
                <td
                  class="p-4 font-bold"
                  :class="
                    bill.amount_residual > 0 ? 'text-error' : 'text-emerald-600'
                  "
                >
                  {{ bill.amount_residual.toLocaleString("en-US") }} ج.م
                </td>
                <td class="p-4">
                  <span
                    class="px-2.5 py-0.5 rounded-full text-xs font-bold"
                    :class="paymentStateClass(bill.payment_state)"
                  >
                    {{ paymentStateText(bill.payment_state) }}
                  </span>
                </td>
                <td class="p-4">
                  <span
                    class="px-2.5 py-0.5 rounded-full text-xs font-bold"
                    :class="stateClass(bill.state)"
                  >
                    {{ stateText(bill.state) }}
                  </span>
                </td>
                <td class="p-4">
                  <div class="flex gap-2">
                    <button
                      @click="openEditModal(bill)"
                      class="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 cursor-pointer flex items-center gap-1"
                    >
                      <Receipt class="w-3 h-3" /> عرض
                    </button>
                    <button
                      v-if="bill.state === 'draft' && can('vendorBill.post')"
                      @click="postBill(bill.id)"
                      class="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 cursor-pointer flex items-center gap-1"
                    >
                      <Send class="w-3 h-3" /> ترحيل
                    </button>
                    <button
                      v-if="bill.state === 'posted' && bill.payment_state !== 'paid' && can('vendorBill.pay')"
                      @click="openPayModal(bill)"
                      class="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 cursor-pointer flex items-center gap-1"
                    >
                      <Landmark class="w-3 h-3" /> دفع
                    </button>
                    <button
                      v-if="bill.state !== 'paid' && bill.state !== 'cancel' && can('vendorBill.cancel')"
                      @click="cancelBill(bill.id)"
                      class="px-3 py-1 bg-error text-white text-xs font-bold rounded-lg hover:bg-error/90 cursor-pointer flex items-center gap-1"
                    >
                      <XCircle class="w-3 h-3" /> إلغاء
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-center gap-4">
        <button
          @click="currentPage--"
          :disabled="currentPage <= 1"
          class="px-4 py-2 border border-outline-variant rounded-lg disabled:opacity-40 cursor-pointer"
        >
          السابق
        </button>
        <span class="flex items-center text-on-white-variant"
          >الصفحة {{ currentPage }} من {{ totalPages }}</span
        >
        <button
          @click="currentPage++"
          :disabled="currentPage >= totalPages"
          class="px-4 py-2 border border-outline-variant rounded-lg disabled:opacity-40 cursor-pointer"
        >
          التالي
        </button>
      </div>

      <!-- Unpaid Bills Summary -->
      <div
        v-if="billList.filter((b) => b.payment_state !== 'paid').length > 0"
        class="bg-white border border-outline-variant rounded-xl p-6"
      >
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-headline-sm font-bold">
            فواتير الموردين غير المسددة
          </h4>
          <NuxtLink
            to="/suppliers"
            class="text-primary text-label-md font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            عرض الموردين <ArrowUpLeft class="w-[14px] h-[14px]" />
          </NuxtLink>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-right border-collapse">
            <thead class="bg-white-low text-on-white-variant">
              <tr>
                <th class="p-3 text-label-md font-bold">رقم الفاتورة</th>
                <th class="p-3 text-label-md font-bold">المورد</th>
                <th class="p-3 text-label-md font-bold">تاريخ الاستحقاق</th>
                <th class="p-3 text-label-md font-bold">الإجمالي</th>
                <th class="p-3 text-label-md font-bold">المتبقي</th>
                <th class="p-3 text-label-md font-bold">الحالة</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/45">
              <tr
                v-for="b in billList
                  .filter((b) => b.payment_state !== 'paid')
                  .slice(0, 10)"
                :key="b.id"
                class="hover:bg-primary/5 transition-colors"
              >
                <td class="p-3 font-bold">{{ b.name }}</td>
                <td class="p-3">{{ b.partner_id?.[1] || "-" }}</td>
                <td class="p-3 text-on-white-variant">
                  {{ b.invoice_date_due || "-" }}
                </td>
                <td class="p-3">
                  {{ b.amount_total.toLocaleString("en-US") }} ج.م
                </td>
                <td class="p-3 font-bold text-error">
                  {{ b.amount_residual.toLocaleString("en-US") }} ج.م
                </td>
                <td class="p-3">
                  <span
                    class="text-[12px] font-bold px-2 py-0.5 rounded-full"
                    :class="
                      b.payment_state === 'overdue'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    "
                  >
                    {{ b.payment_state === "overdue" ? "متأخر" : "مستحق" }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>

  <!-- Payment Modal -->
  <div
    v-if="showPaymentModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    @click.self="showPaymentModal = false"
  >
    <div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-headline-sm font-bold">تسجيل دفعة</h3>
        <button
          @click="showPaymentModal = false"
          class="cursor-pointer text-on-white-variant hover:text-on-white"
        >
          <X class="w-5 h-5" />
        </button>
      </div>
      <div class="space-y-4">
        <div>
          <label class="block text-label-md text-on-white-variant mb-1">المبلغ</label>
          <input
            v-model.number="payAmount"
            type="number"
            step="0.01"
            min="0"
            class="w-full h-11 px-3 border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label class="block text-label-md text-on-white-variant mb-1">تاريخ الدفع</label>
          <input
            v-model="payDate"
            type="date"
            class="w-full h-11 px-3 border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div class="flex gap-3 pt-2">
          <button
            @click="showPaymentModal = false"
            class="flex-1 h-11 border border-outline-variant rounded-lg font-bold cursor-pointer hover:bg-white-low"
          >
            إلغاء
          </button>
          <button
            @click="submitPayment"
            :disabled="payAmount <= 0"
            class="flex-1 h-11 bg-primary text-white rounded-lg font-bold cursor-pointer hover:bg-primary/90 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Landmark class="w-4 h-4" /> تأكيد الدفع
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Edit Vendor Bill Modal -->
  <EditVendorBillModal
    v-model:open="showEditModal"
    :bill-id="editingBillId"
    @saved="refresh"
  />

  <!-- Feedback Toast -->
  <div
    class="fixed bottom-10 left-1/2 -translate-x-1/2 z-100 transition-all duration-500 bg-white text-primary"
    :class="
      showToast
        ? 'translate-y-0 opacity-100'
        : 'translate-y-32 opacity-0 pointer-events-none'
    "
  >
    <div
      class="px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
      :class="
        toastType === 'success'
          ? 'bg-on-white text-white'
          : 'bg-error text-on-error'
      "
    >
      <component
        :is="toastType === 'success' ? CheckCheck : AlertCircle"
        class="w-5 h-5 shrink-0"
      />
      <div>
        <p class="font-bold text-sm text-primary">{{ toastMessage }}</p>
      </div>
    </div>
  </div>
</template>

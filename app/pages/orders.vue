<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import {
  Banknote,
  Receipt,
  Search,
  CheckCircle,
  XCircle,
  RotateCcw,
  RefreshCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  Eye,
  Edit3,
  Printer,
  LoaderCircle,
  CloudOff,
  AlertCircle,
} from "@lucide/vue";
import type { POSOrder, OrderListResponse } from "~/types/pos";
import { usePermissions } from "~/composables/usePermissions";
import { useReceiptPrint } from "~/composables/useReceiptPrint";
import { formatDate, formatDateLong, formatDateWithTime } from "~/lib/dateUtils";

const route = useRoute();
const { canViewPage, can } = usePermissions();
const { fetchReceiptConfig, printReceipt } = useReceiptPrint();

onMounted(() => {
  fetchReceiptConfig();
});

if (import.meta.client) {
  if (!canViewPage(route.path)) {
    navigateTo("/");
  }
}

const searchQuery = ref("");
const statusFilter = ref("");
const sessionSearch = ref("");
const debouncedSearchQuery = ref("");
const debouncedSessionSearch = ref("");
const sourceFilter = ref("");
const debouncedSource = ref("");
const todayDateStr = new Date().toISOString().slice(0, 10);
const dateFrom = ref(todayDateStr);
const dateTo = ref(todayDateStr);
const debouncedDateFrom = ref(todayDateStr);
const debouncedDateTo = ref(todayDateStr);
const terminalFilter = ref("");
const debouncedTerminal = ref("");
const currentPage = ref(1);

let searchTimeout: ReturnType<typeof setTimeout>;
watch(searchQuery, (val) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    debouncedSearchQuery.value = val;
    currentPage.value = 1;
  }, 400);
});

let sessionTimeout: ReturnType<typeof setTimeout>;
watch(sessionSearch, (val) => {
  clearTimeout(sessionTimeout);
  sessionTimeout = setTimeout(() => {
    debouncedSessionSearch.value = val;
    currentPage.value = 1;
  }, 400);
});

watch(sourceFilter, (val) => {
  debouncedSource.value = val;
  currentPage.value = 1;
});

let dateFromTimeout: ReturnType<typeof setTimeout>;
watch(dateFrom, (val) => {
  clearTimeout(dateFromTimeout);
  dateFromTimeout = setTimeout(() => {
    debouncedDateFrom.value = val;
    currentPage.value = 1;
  }, 400);
});

let dateToTimeout: ReturnType<typeof setTimeout>;
watch(dateTo, (val) => {
  clearTimeout(dateToTimeout);
  dateToTimeout = setTimeout(() => {
    debouncedDateTo.value = val;
    currentPage.value = 1;
  }, 400);
});

watch(terminalFilter, (val) => {
  debouncedTerminal.value = val;
  currentPage.value = 1;
});

const terminals = ref<{ id: number; name: string }[]>([]);
const fetchTerminals = async () => {
  try {
    const res = await $fetch<{ success: boolean; data: { id: number; name: string }[] }>(
      "/api/pos/registers",
    );
    terminals.value = res.data || [];
  } catch {
    terminals.value = [];
  }
};
onMounted(() => {
  fetchTerminals();
});

const limit = ref(28);

const showToast = ref(false);
const toastMessage = ref("");
const toastType = ref<"success" | "error">("success");
const selectedOrderId = ref<number | null>(null);
const drawerOpen = ref(false);
const editDrawerOpen = ref(false);

const todayStr = computed(() => formatDateLong(new Date()));

const {
  data: apiResponse,
  status,
  error,
  refresh,
} = useFetch<OrderListResponse>("/api/orders", {
  lazy: true,
  query: {
    page: currentPage,
    limit,
    search: debouncedSearchQuery,
    status: statusFilter,
    session_id: debouncedSessionSearch,
    date_from: debouncedDateFrom,
    date_to: debouncedDateTo,
    source: debouncedSource,
    config_name: debouncedTerminal,
  },
  watch: [
    currentPage,
    debouncedSearchQuery,
    statusFilter,
    debouncedSessionSearch,
    debouncedDateFrom,
    debouncedDateTo,
    debouncedSource,
    debouncedTerminal,
  ],
  transform: (response) => {
    if (!response.data) response.data = [];
    return response;
  },
});

const ordersList = computed<POSOrder[]>(() => apiResponse.value?.data || []);
const totalItems = computed(() => apiResponse.value?.totalItems || 0);
const totalPages = computed(() => apiResponse.value?.totalPages || 1);

const startItem = computed(() =>
  ordersList.value.length ? (currentPage.value - 1) * limit.value + 1 : 0,
);
const endItem = computed(() =>
  Math.min(currentPage.value * limit.value, totalItems.value),
);

const totalSales = computed(() =>
  ordersList.value
    .filter((o) => o.state !== "cancelled" && o.state !== "draft")
    .reduce((sum, o) => sum + o.amount_total, 0),
);

const totalDiscounts = computed(() =>
  ordersList.value
    .filter((o) => o.state !== "cancelled" && o.state !== "draft")
    .reduce((sum, o) => sum + (o.amount_discount || 0), 0),
);

const totalUnpaid = computed(() =>
  ordersList.value
    .filter((o) => o.state !== "cancelled" && o.state !== "draft")
    .reduce((sum, o) => sum + (o.amount_total - o.amount_paid), 0),
);

const completedCount = computed(
  () => ordersList.value.filter((o) => o.state !== "cancelled" && o.state !== "draft").length,
);

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

function openDetail(orderId: number) {
  selectedOrderId.value = orderId;
  drawerOpen.value = true;
}

function openDetailForEdit(orderId: number) {
  selectedOrderId.value = orderId;
  editDrawerOpen.value = true;
}

function closeDetail() {
  drawerOpen.value = false;
  selectedOrderId.value = null;
}

async function voidOrder(orderId: number, orderName: string) {
  if (!confirm(`هل أنت متأكد من رغبتك في إلغاء الطلب رقم #${orderName}؟`))
    return;
  try {
    const res = await $fetch<any>("/api/orders/status", {
      method: "POST",
      body: { order_id: orderId, state: "cancelled" },
    });
    if (res.success) {
      showToastMessage("تم إلغاء الطلب بنجاح", "success");
      refresh();
    } else {
      showToastMessage(res.message || "فشل إلغاء الطلب", "error");
    }
  } catch (err: any) {
    showToastMessage(
      err.message || err.statusMessage || "خطأ في الاتصال بالخادم",
      "error",
    );
  }
}

async function printOrder(order: POSOrder) {
  try {
    await fetchReceiptConfig();
    const data = await $fetch<any>("/api/orders/detail", {
      query: { id: order.id },
    });
    if (!data.success) return;
    const lines = data.lines || [];
    const payments = data.payments || [];
    const totalFromLines = lines.reduce(
      (sum: number, l: any) => sum + l.price_subtotal,
      0,
    );
    await printReceipt({
      orderName: order.name,
      lastOrderItems: lines.map((l: any) => ({
        product: { name: l.product_id?.[1] || `#${l.product_id?.[0] || ""}` },
        quantity: l.qty,
        price: l.price_unit,
        discount: l.discount,
      })),
      lastOrderPayments: payments.map((p: any) => ({
        methodName:
          p.payment_method_id?.[1] || `#${p.payment_method_id?.[0] || ""}`,
        amount: p.amount,
      })),
      lastOrderSubtotal: totalFromLines,
      lastOrderDiscount: lines.reduce(
        (sum: number, l: any) =>
          sum + (l.price_unit * l.qty * l.discount) / 100,
        0,
      ),
      lastOrderServiceFee: order.service_fee || 0,
      lastOrderGrandTotal: order.amount_total,
      lastOrderCustomerName: data.order.partner_id?.[1] || "",
      lastOrderCustomerPhone: data.order.partner_phone || "",
      lastOrderCustomerAddress: data.order.partner_address || "",
    });
  } catch {
    // Silently fail
  }
}

function showToastMessage(message: string, type: "success" | "error") {
  toastMessage.value = message;
  toastType.value = type;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 3000);
}

const formatTime = (dateStr: string) => {
  if (!dateStr) return "—";
  return formatDateWithTime(dateStr);
};

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  paid: "مدفوع",
  done: "منتهي",
  cancelled: "ملغي",
  cancel: "ملغي",
  invoiced: "مفوتر",
  refund: "مرتجع",
};

const statusColors: Record<string, string> = {
  draft: "bg-secondary-container text-secondary",
  paid: "bg-primary/10 text-primary",
  done: "bg-tertiary-container/30 text-tertiary",
  cancelled: "bg-error-container text-error",
  cancel: "bg-error-container text-error",
  invoiced: "bg-secondary-fixed text-on-secondary-fixed",
  refund: "bg-amber-100 text-amber-700",
};

const statusIcons: Record<string, any> = {
  draft: RefreshCw,
  paid: CheckCircle,
  done: CheckCircle,
  cancelled: XCircle,
  cancel: XCircle,
  invoiced: CheckCircle,
  refund: RotateCcw,
};
</script>

<template>
  <div class="space-y-8 max-w-7xl mx-auto relative">
    <!-- Loading State -->
    <div
      v-if="status === 'pending' && ordersList.length === 0"
      class="h-[calc(100vh-200px)] flex items-center justify-center"
    >
      <div class="flex flex-col items-center gap-3 text-on-white-variant">
        <LoaderCircle class="w-8 h-8 animate-spin text-primary" />
        <span class="text-[13px]">جاري تحميل الطلبات...</span>
      </div>
    </div>

    <template v-else>
      <!-- Error State -->
      <div
        v-if="status === 'error'"
        class="bg-error/10 border border-error text-error p-6 rounded-2xl text-center"
      >
        <CloudOff class="w-10 h-10 mb-2 inline-block" />
        <p class="font-bold">فشل الاتصال بالخادم</p>
        <p class="text-sm opacity-80">{{ error?.message }}</p>
        <button
          @click="refresh()"
          class="mt-4 px-6 py-2 bg-error text-on-error rounded-full font-bold active:scale-95 transition-all cursor-pointer"
        >
          إعادة المحاولة
        </button>
      </div>

      <template v-if="status !== 'error'">
        <!-- Top KPI Dashboard -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            class="bg-white border border-outline-variant p-6 rounded-2xl flex items-center justify-between shadow-sm"
          >
            <div class="space-y-1">
              <p class="text-label-md text-on-white-variant">إجمالي المبيعات</p>
              <h2 class="text-display-sm font-bold text-primary">
                {{ totalSales.toLocaleString("en-US") }} ج.م
              </h2>
              <p class="text-xs text-on-white-variant">
                إجمالي المبيعات المعروضة
              </p>
            </div>
            <div
              class="w-14 h-14 bg-primary-container/10 rounded-full flex items-center justify-center text-primary"
            >
              <Banknote class="w-7 h-7" />
            </div>
          </div>

          <div
            class="bg-white border border-outline-variant p-6 rounded-2xl flex items-center justify-between shadow-sm"
          >
            <div class="space-y-1">
              <p class="text-label-md text-on-white-variant">
                الخصومات (خسارة)
              </p>
              <h2 class="text-display-sm font-bold text-error">
                {{ (totalDiscounts + totalUnpaid).toLocaleString("en-US") }} ج.م
              </h2>
              <p class="text-xs text-on-white-variant">
                إجمالي قيم الخصومات + غير مدفوع
              </p>
            </div>
            <div
              class="w-14 h-14 bg-error-container/20 rounded-full flex items-center justify-center text-error"
            >
              <Trash2 class="w-7 h-7" />
            </div>
          </div>

          <div
            class="bg-white border border-outline-variant p-6 rounded-2xl flex items-center justify-between shadow-sm"
          >
            <div class="space-y-1">
              <p class="text-label-md text-on-white-variant">
                الطلبات المكتملة
              </p>
              <h2 class="text-display-sm font-bold text-on-white">
                {{ completedCount }} طلب
              </h2>
              <p class="text-xs text-on-white-variant">
                إجمالي {{ totalItems }} طلب في قاعدة البيانات
              </p>
            </div>
            <div
              class="w-14 h-14 bg-secondary-container/20 rounded-full flex items-center justify-center text-secondary"
            >
              <Receipt class="w-7 h-7" />
            </div>
          </div>
        </div>

        <!-- Orders Table Section -->
        <div
          class="bg-white border border-outline-variant rounded-2xl shadow-sm overflow-hidden"
        >
          <div
            class="p-6 border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <h3 class="text-headline-sm font-bold text-on-white">
              سجل الطلبات
              <span class="text-label-md text-on-white-variant font-normal"
                >({{ todayStr }})</span
              >
            </h3>
            <div class="flex gap-2 flex-wrap">
              <div class="relative">
                <Search
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-on-white-variant w-5 h-5"
                />
                <input
                  v-model="searchQuery"
                  class="bg-white text-on-white border border-outline-variant rounded-xl pr-10 pl-4 py-2 w-full md:w-56 focus:ring-2 focus:ring-primary outline-none"
                  placeholder="البحث برقم الطلب..."
                  type="text"
                />
              </div>
              <select
                v-model="statusFilter"
                class="bg-white text-on-white border border-outline-variant rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="">جميع الحالات</option>
                <option value="draft">مسودة</option>
                <option value="paid">مدفوع</option>
                <option value="done">منتهي</option>
                <option value="cancelled">ملغي</option>
                <option value="cancel">ملغي</option>
                <option value="invoiced">مفوتر</option>
                <option value="refund">مرتجع</option>
              </select>
              <div class="flex items-center gap-1">
                <input
                  v-model="dateFrom"
                  type="date"
                  class="bg-white text-on-white border border-outline-variant rounded-xl px-3 py-2 w-[140px] focus:ring-2 focus:ring-primary outline-none"
                />
                <span class="text-on-white-variant text-sm">إلى</span>
                <input
                  v-model="dateTo"
                  type="date"
                  class="bg-white text-on-white border border-outline-variant rounded-xl px-3 py-2 w-[140px] focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div class="relative">
                <Search
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-on-white-variant w-5 h-5"
                />
                <input
                  v-model="sessionSearch"
                  class="bg-white text-on-white border border-outline-variant rounded-xl pr-10 pl-4 py-2 w-full md:w-48 focus:ring-2 focus:ring-primary outline-none"
                  placeholder="البحث برقم الوردية..."
                  type="text"
                />
              </div>
              <select
                v-model="sourceFilter"
                class="bg-white text-on-white border border-outline-variant rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="">جميع الطلبات</option>
                <option value="pos">نقطة بيع</option>
                <option value="callcenter">مركز الاتصال</option>
              </select>
              <select
                v-model="terminalFilter"
                class="bg-white text-on-white border border-outline-variant rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="">جميع الأجهزة</option>
                <option
                  v-for="t in terminals"
                  :key="t.id"
                  :value="t.name"
                >{{ t.name }}</option>
              </select>
              <button
                @click="refresh()"
                class="bg-white-high text-on-white-variant p-2.5 rounded-xl hover:bg-outline-variant transition-colors cursor-pointer"
                title="تحديث"
              >
                <RefreshCw
                  class="w-5 h-5"
                  :class="{ 'animate-spin': status === 'pending' }"
                />
              </button>
            </div>
          </div>

          <div class="overflow-x-auto custom-scrollbar">
            <table class="w-full text-right border-collapse">
              <thead>
                <tr
                  class="bg-white-low text-on-white-variant border-b border-outline-variant"
                >
                  <th class="px-6 py-4 font-bold text-label-md">رقم الطلب</th>
                  <th class="px-6 py-4 font-bold text-label-md">الوقت</th>
                  <th class="px-6 py-4 font-bold text-label-md">العميل</th>
                  <th class="px-6 py-4 font-bold text-label-md">الإجمالي</th>
                  <th class="px-6 py-4 font-bold text-label-md">الخصم</th>
                  <th class="px-6 py-4 font-bold text-label-md">رسوم الخدمة</th>
                  <th class="px-6 py-4 font-bold text-label-md">المدفوع</th>
                  <th class="px-6 py-4 font-bold text-label-md">الحالة</th>
                  <th class="px-6 py-4 font-bold text-label-md">الوردية</th>
                  <th class="px-6 py-4 font-bold text-label-md">المصدر</th>
                  <th class="px-6 py-4 font-bold text-label-md">الجهاز</th>
                  <th class="px-6 py-4 font-bold text-label-md">الإجراءات</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/40">
                <tr
                  v-for="order in ordersList"
                  :key="order.id"
                  class="hover:bg-white-low transition-colors group cursor-pointer"
                  @click="openDetail(order.id)"
                >
                  <td class="px-6 py-5">
                    <span class="font-bold text-on-white">{{
                      order.name
                    }}</span>
                  </td>
                  <td class="px-6 py-5 text-on-white-variant">
                    {{ formatTime(order.date_order) }}
                  </td>
                  <td class="px-6 py-5">
                    <div class="flex items-center gap-2">
                      <span
                        class="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed text-xs font-bold"
                      >
                        {{
                          order.partner_id
                            ? order.partner_id[1].slice(0, 2)
                            : "ن"
                        }}
                      </span>
                      <span class="text-on-white">{{
                        order.partner_id ? order.partner_id[1] : "عميل نقدي"
                      }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-5 font-bold text-primary">
                    {{ Number(order.amount_total).toLocaleString("en-US") }}
                    ج.م
                  </td>
                  <td class="px-6 py-5 font-bold text-red-500">
                    {{ Number(order.amount_discount || order.order_discount || 0).toLocaleString("en-US") }}
                    ج.م
                  </td>
                  <td class="px-6 py-5 font-bold text-amber-600">
                    {{ Number(order.service_fee || 0).toLocaleString("en-US") }}
                    ج.م
                  </td>
                  <td class="px-6 py-5 font-bold"
                      :class="order.amount_paid >= order.amount_total ? 'text-success' : 'text-error'">
                    {{ Number(order.amount_paid).toLocaleString("en-US") }}
                    ج.م
                  </td>
                  <td class="px-6 py-5">
                    <div
                      class="flex items-center gap-1.5 px-3 py-1 rounded-full w-fit text-[12px] font-bold"
                      :class="
                        statusColors[order.state] ||
                        'bg-white-low text-on-white-variant'
                      "
                    >
                      <component
                        :is="statusIcons[order.state] || RefreshCw"
                        class="w-[14px] h-[14px]"
                      />
                      <span>{{
                        statusLabels[order.state] || order.state
                      }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-5 text-on-white-variant">
                    {{ order.session_id?.[1] || "—" }}
                  </td>
                  <td class="px-6 py-5">
                    <div
                      class="flex items-center gap-1.5 px-3 py-1 rounded-full w-fit text-[12px] font-bold"
                      :class="order.source === 'callcenter'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'"
                    >
                      <span>{{ order.source === 'callcenter' ? 'مركز الاتصال' : 'نقطة بيع' }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-5 text-on-white-variant text-[13px]">
                    {{ order.config_name || "—" }}
                  </td>
                  <td class="px-6 py-5" @click.stop>
                    <div class="flex items-center gap-2">
                      <button
                        @click="openDetail(order.id)"
                        class="p-2 rounded-lg hover:bg-white text-primary transition-colors cursor-pointer"
                        title="عرض التفاصيل"
                      >
                        <Eye class="w-[18px] h-[18px]" />
                      </button>
                      <button
                        v-if="order.state !== 'cancelled' && order.state !== 'refund' && can('order.editPayment')"
                        @click.stop="openDetailForEdit(order.id)"
                        class="p-2 rounded-lg hover:bg-white text-amber-600 transition-colors cursor-pointer"
                        title="تعديل الطلب"
                      >
                        <Edit3 class="w-[18px] h-[18px]" />
                      </button>
                      <button
                        v-if="order.state !== 'cancelled'"
                        @click.stop="printOrder(order)"
                        class="p-2 rounded-lg hover:bg-white text-secondary transition-colors cursor-pointer"
                        title="طباعة الفاتورة"
                      >
                        <Printer class="w-[18px] h-[18px] text-primary" />
                      </button>
                      <button
                        v-if="
                          order.state !== 'cancelled' &&
                          order.state !== 'refund' &&
                          can('order.void')
                        "
                        @click="voidOrder(order.id, order.name)"
                        class="text-error border border-error/20 px-3 py-1.5 rounded-lg hover:bg-error/10 transition-colors flex items-center gap-2 text-label-md font-bold cursor-pointer"
                      >
                        <Trash2 class="w-[14px] h-[14px]" />
                        إلغاء
                      </button>
                    </div>
                  </td>
                </tr>

                <!-- Empty State -->
                <tr v-if="ordersList.length === 0 && status !== 'pending'">
                  <td
                    colspan="11"
                    class="p-16 text-center text-on-white-variant"
                  >
                    <AlertCircle
                      class="w-10 h-10 block mb-2 mx-auto text-outline"
                    />
                    <p class="font-bold">لا توجد طلبات مطابقة</p>
                    <p class="text-sm mt-1">
                      حاول تغيير معايير البحث أو التصفية
                    </p>
                  </td>
                </tr>

                <!-- Loading rows -->
                <tr v-if="status === 'pending' && ordersList.length > 0">
                  <td colspan="11" class="p-8 text-center">
                    <LoaderCircle
                      class="w-6 h-6 animate-spin inline-block text-primary"
                    />
                    <span class="mr-2 text-on-white-variant text-sm"
                      >جاري التحديث...</span
                    >
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div
            class="p-4 border-t border-outline-variant flex items-center justify-between bg-white-low"
          >
            <div class="flex items-center gap-3">
              <p class="text-label-md text-on-white-variant">
                عرض {{ startItem }}-{{ endItem }} من أصل {{ totalItems }} طلب
              </p>
              <select
                v-model="limit"
                class="bg-white text-on-white border border-outline-variant rounded-xl px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option :value="28">28</option>
                <option :value="100">100</option>
                <option :value="200">200</option>
                <option :value="300">300</option>
              </select>
            </div>
            <div class="flex gap-2" v-if="totalPages > 1">
              <button
                @click="prevPage"
                :disabled="currentPage <= 1"
                class="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-white transition-all text-on-white-variant disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft class="w-5 h-5" />
              </button>
              <button
                v-for="p in totalPages"
                :key="p"
                @click="currentPage = p"
                class="w-10 h-10 flex items-center justify-center rounded-lg font-bold cursor-pointer"
                :class="
                  currentPage === p
                    ? 'bg-primary text-white shadow-md'
                    : 'hover:bg-white text-on-white border border-outline-variant'
                "
              >
                {{ p }}
              </button>
              <button
                @click="nextPage"
                :disabled="currentPage >= totalPages"
                class="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-white transition-all text-on-white-variant disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Order Detail Drawer -->
    <OrdersOrderDetailDrawer
      v-model:isOpen="drawerOpen"
      :order-id="selectedOrderId"
      @refresh="refresh"
    />

    <OrdersOrderEditDrawer
      v-model:isOpen="editDrawerOpen"
      :order-id="selectedOrderId"
      @refresh="refresh"
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
          <p class="font-bold text-sm">{{ toastMessage }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

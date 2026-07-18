<script setup lang="ts">
import { ref, computed } from "vue";
import {
  TrendingUp,
  Banknote,
  Wallet,
  ArrowLeft,
  PieChart,
  FileWarning,
  FileText,
  Landmark,
  BarChart3,
  Receipt,
  Filter,
  LoaderCircle,
  CloudOff,
} from "@lucide/vue";
import type { VendorBill, VendorBillApiResponse } from "~/types/vendorBill";
import { usePermissions } from "~/composables/usePermissions";

const route = useRoute();
const { canViewPage } = usePermissions();

if (import.meta.client) {
  if (!canViewPage(route.path)) {
    navigateTo('/')
  }
}

const dateFrom = ref("");
const dateTo = ref("");

const now = new Date();
const defaultDateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
const defaultDateTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

const selectedDateFrom = ref(defaultDateFrom);
const selectedDateTo = ref(defaultDateTo);

// KPI data
const { data: kpiData, status: kpiStatus } = useFetch("/api/kpi/dashboard", {
  query: { date_from: selectedDateFrom, date_to: selectedDateTo },
});

const totalRevenue = computed(
  () => (kpiData.value as any)?.kpis?.[0]?.value || "0.00 ج.م",
);
const totalExpenses = computed(
  () => (kpiData.value as any)?.kpis?.[1]?.value || "0.00 ج.م",
);

// Sales orders
const { data: ordersData } = useFetch<any>("/api/orders", {
  query: {
    page: 1,
    limit: 50,
    date_from: selectedDateFrom,
    date_to: selectedDateTo,
  },
});

// Vendor bills
const vendorBillsPage = ref(1);
const {
  data: vbData,
  status: vbStatus,
  refresh: vbRefresh,
} = useFetch<VendorBillApiResponse>("/api/vendor-bills", {
  query: {
    page: vendorBillsPage,
    limit: 20,
    date_from: selectedDateFrom,
    date_to: selectedDateTo,
  },
});

const vendorBills = computed<VendorBill[]>(() => vbData.value?.data || []);

// Combined transactions
const transactions = computed(() => {
  const items: any[] = [];

  (ordersData.value as any)?.data?.forEach((o: any) => {
    items.push({
      type: "مبيعات",
      typeColor: "bg-primary",
      desc: `${o.name} - ${o.partner_id?.[1] || "عميل نقدي"}`,
      time: o.date_order?.slice(0, 10) || "",
      amount: `+${Number(o.amount_total).toLocaleString("en-US")} ج.م`,
      amountColor: "text-primary",
      status:
        o.state === "paid" || o.state === "done"
          ? "مكتمل"
          : o.state === "draft"
            ? "مسودة"
            : o.state,
      statusColor:
        o.state === "paid" || o.state === "done"
          ? "bg-primary/10 text-primary"
          : "bg-amber-100 text-amber-800",
    });
  });

  vendorBills.value?.forEach((b) => {
    const isPaid = b.payment_state === "paid";
    const isOverdue = b.payment_state === "overdue";
    items.push({
      type: "فواتير موردين",
      typeColor: "bg-amber-500",
      desc: `${b.name} - ${b.partner_id?.[1] || ""}`,
      time: b.invoice_date || "",
      amount: `-${Number(b.amount_total).toLocaleString("en-US")} ج.م`,
      amountColor: "text-error",
      status: isPaid
        ? "مدفوع"
        : isOverdue
          ? "متأخر"
          : b.state === "draft"
            ? "مسودة"
            : b.state === "posted"
              ? "مستحق"
              : b.state,
      statusColor: isPaid
        ? "bg-emerald-100 text-emerald-800"
        : isOverdue
          ? "bg-red-100 text-red-800"
          : "bg-slate-100 text-slate-600",
    });
  });

  items.sort((a: any, b: any) => (b.time || "").localeCompare(a.time || ""));
  return items;
});

// Totals
const totalPayable = computed(() =>
  vendorBills.value
    .filter((b) => b.payment_state !== "paid")
    .reduce((s, b) => s + b.amount_residual, 0),
);

const totalVendorBills = computed(() =>
  vendorBills.value.reduce((s, b) => s + b.amount_total, 0),
);

const activeFilter = ref("all");
const filteredTransactions = computed(() => {
  if (activeFilter.value === "all") return transactions.value;
  const filterMap: Record<string, string> = {
    sales: "مبيعات",
    bills: "فواتير موردين",
    expenses: "مصاريف",
  };
  return transactions.value.filter(
    (t: any) => t.type === filterMap[activeFilter.value],
  );
});

const reports = [
  {
    title: "قائمة الدخل",
    desc: "ملخص الأرباح والخسائر للربع الحالي",
    icon: FileText,
  },
  {
    title: "الميزانية العمومية",
    desc: "الأصول والالتزامات وحقوق الملكية",
    icon: Landmark,
  },
  {
    title: "تقرير التدفق النقدي",
    desc: "حركة السيولة النقدية الواردة والصادرة",
    icon: BarChart3,
  },
  {
    title: "الإقرار الضريبي",
    desc: "ضريبة القيمة المضافة للفترة السابقة",
    icon: Receipt,
  },
];

const loadingAll = computed(() => kpiStatus.value === "pending");
</script>

<template>
  <div class="space-y-8">
    <div
      v-if="loadingAll"
      class="h-[calc(100vh-200px)] flex items-center justify-center"
    >
      <div class="flex flex-col items-center gap-3 text-on-white-variant">
        <LoaderCircle class="w-8 h-8 animate-spin text-primary" />
        <span class="text-[13px]">جاري تحميل البيانات المالية...</span>
      </div>
    </div>

    <template v-else>
      <!-- Date Filter -->
      <div
        class="flex items-center gap-4 bg-white border border-outline-variant rounded-xl p-4"
      >
        <Filter class="w-5 h-5 text-on-white-variant" />
        <div class="flex items-center gap-2">
          <label class="text-label-md text-on-white-variant">من</label>
          <input
            v-model="selectedDateFrom"
            type="date"
            class="h-10 px-3 border border-outline-variant rounded-lg text-sm"
          />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-label-md text-on-white-variant">إلى</label>
          <input
            v-model="selectedDateTo"
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
              <TrendingUp class="w-6 h-6" />
            </div>
          </div>
          <p class="text-on-white-variant text-label-md">إيرادات الفترة</p>
          <h3 class="text-price-display font-bold text-primary">
            {{ totalRevenue }}
          </h3>
        </div>

        <div class="bg-white border border-outline-variant rounded-xl p-6">
          <div class="flex items-center gap-3 mb-2">
            <div
              class="w-10 h-10 rounded-lg bg-error-container/20 flex items-center justify-center text-error"
            >
              <Banknote class="w-6 h-6" />
            </div>
          </div>
          <p class="text-on-white-variant text-label-md">مصاريف الفترة</p>
          <h3 class="text-price-display font-bold text-on-white">
            {{ totalExpenses }}
          </h3>
        </div>

        <div class="bg-white border border-outline-variant rounded-xl p-6">
          <div class="flex items-center gap-3 mb-2">
            <div
              class="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-600"
            >
              <Receipt class="w-6 h-6" />
            </div>
          </div>
          <p class="text-on-white-variant text-label-md">
            فواتير الموردين (إجمالي)
          </p>
          <h3 class="text-price-display font-bold text-amber-600">
            {{ totalVendorBills.toLocaleString("en-US") }} ج.م
          </h3>
        </div>

        <div class="bg-white border border-outline-variant rounded-xl p-6">
          <div class="flex items-center gap-3 mb-2">
            <div
              class="w-10 h-10 rounded-lg bg-error/20 flex items-center justify-center text-error"
            >
              <Wallet class="w-6 h-6" />
            </div>
          </div>
          <p class="text-on-white-variant text-label-md">المستحق للموردين</p>
          <h3 class="text-price-display font-bold text-error">
            {{ totalPayable.toLocaleString("en-US") }} ج.م
          </h3>
        </div>
      </div>

      <!-- Filters & Transactions -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div
          class="lg:col-span-2 bg-white border border-outline-variant rounded-xl flex flex-col overflow-hidden"
        >
          <div
            class="p-4 border-b border-outline-variant flex items-center justify-between"
          >
            <h4 class="text-headline-sm font-bold">المعاملات المالية</h4>
            <div class="flex gap-2">
              <button
                @click="activeFilter = 'all'"
                class="px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer"
                :class="
                  activeFilter === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-white-low text-on-white-variant'
                "
              >
                الكل
              </button>
              <button
                @click="activeFilter = 'sales'"
                class="px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer"
                :class="
                  activeFilter === 'sales'
                    ? 'bg-primary text-white'
                    : 'bg-white-low text-on-white-variant'
                "
              >
                مبيعات
              </button>
              <button
                @click="activeFilter = 'bills'"
                class="px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer"
                :class="
                  activeFilter === 'bills'
                    ? 'bg-primary text-white'
                    : 'bg-white-low text-on-white-variant'
                "
              >
                فواتير الموردين
              </button>
            </div>
          </div>
          <div class="overflow-x-auto custom-scrollbar">
            <table class="w-full text-right border-collapse">
              <thead class="bg-white">
                <tr>
                  <th class="p-4 text-label-md font-bold text-on-white-variant">
                    النوع
                  </th>
                  <th class="p-4 text-label-md font-bold text-on-white-variant">
                    البيان
                  </th>
                  <th class="p-4 text-label-md font-bold text-on-white-variant">
                    التاريخ
                  </th>
                  <th
                    class="p-4 text-label-md font-bold text-on-white-variant text-left"
                  >
                    المبلغ
                  </th>
                  <th class="p-4 text-label-md font-bold text-on-white-variant">
                    الحالة
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant">
                <tr
                  v-for="(t, i) in filteredTransactions"
                  :key="i"
                  class="hover:bg-white-low transition-colors group"
                >
                  <td class="p-4">
                    <div class="flex items-center gap-2">
                      <span
                        class="w-2 h-2 rounded-full"
                        :class="t.typeColor"
                      ></span>
                      <span class="text-body-md">{{ t.type }}</span>
                    </div>
                  </td>
                  <td class="p-4 text-body-md font-bold">{{ t.desc }}</td>
                  <td class="p-4 text-label-md text-on-white-variant">
                    {{ t.time }}
                  </td>
                  <td
                    class="p-4 text-body-md font-bold text-left"
                    :class="t.amountColor"
                  >
                    {{ t.amount }}
                  </td>
                  <td class="p-4">
                    <span
                      class="text-[12px] font-bold px-2 py-0.5 rounded-full"
                      :class="t.statusColor"
                      >{{ t.status }}</span
                    >
                  </td>
                </tr>
                <tr v-if="filteredTransactions.length === 0">
                  <td colspan="5" class="p-8 text-center text-on-white-variant">
                    لا توجد معاملات في هذه الفترة
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Reports -->
        <div
          class="bg-white border border-outline-variant rounded-xl flex flex-col"
        >
          <div class="p-6 border-b border-outline-variant bg-white-bright">
            <h4 class="text-headline-sm font-bold">التقارير المالية</h4>
          </div>
          <div class="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
            <div
              v-for="(rep, idx) in reports"
              :key="idx"
              class="p-4 border border-outline-variant rounded-lg hover:bg-white transition-all cursor-pointer group"
            >
              <div class="flex items-center gap-3">
                <div
                  class="p-2 bg-secondary-container text-on-secondary-container rounded group-hover:bg-primary group-hover:text-white transition-colors"
                >
                  <component :is="rep.icon" class="w-5 h-5" />
                </div>
                <div>
                  <p class="text-body-md font-bold">{{ rep.title }}</p>
                  <p class="text-label-md text-on-white-variant">
                    {{ rep.desc }}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="p-4 mt-auto">
            <button
              class="w-full py-2.5 rounded-lg border border-primary text-primary font-bold hover:bg-primary/5 transition-colors cursor-pointer"
            >
              إعداد تقرير مخصص
            </button>
          </div>
        </div>
      </div>

      <!-- Bills Summary -->
      <div class="bg-white border border-outline-variant rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-headline-sm font-bold">
            فواتير الموردين غير المسددة
          </h4>
          <NuxtLink
            to="/suppliers"
            class="text-primary text-label-md font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            عرض الموردين <ArrowLeft class="w-[14px] h-[14px]" />
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
                v-for="b in vendorBills
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
              <tr
                v-if="
                  vendorBills.filter((b) => b.payment_state !== 'paid')
                    .length === 0
                "
              >
                <td colspan="6" class="p-6 text-center text-on-white-variant">
                  لا توجد فواتير غير مسددة
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

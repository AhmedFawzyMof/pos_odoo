<script setup lang="ts">
import { ref, watch } from "vue";
import {
  TrendingUp,
  Banknote,
  Wallet,
  ShoppingCart,
  Truck,
  Receipt,
  Users,
  Package,
  ShoppingBag,
  ClipboardList,
  Timer,
  UserCheck,
  Activity,
  Circle,
} from "@lucide/vue";
import Skeleton from "@/components/ui/skeleton/Skeleton.vue";
import ReportChart from "./ReportChart.vue";
import ReportTable from "./ReportTable.vue";

const props = defineProps<{
  reportType: string;
  dateFrom: string;
  dateTo: string;
  refreshKey?: number;
  locationId?: number | null;
}>();

const emit = defineEmits<{
  loading: [v: boolean];
}>();

const reportData = ref<any>(null);
const pending = ref(false);
const error = ref<any>(null);

const totalUnpaid = computed(() => {
  if (!reportData.value?.rows?.length) return 0;
  return reportData.value.rows.reduce((sum: number, row: any) => {
    const total = Number(row.total ?? row.amount_total ?? row["الإجمالي"] ?? 0);
    const paid = Number(row.paid ?? row.amount_paid ?? row["المدفوع"] ?? 0);
    return sum + Math.max(0, total - paid);
  }, 0);
});

const isDiscountKpi = (label: string) => {
  return label.includes("خصم") || label.includes("discount") || label.includes("Discount");
};

const discountKpi = computed(() => {
  if (!reportData.value?.summary?.length) return null;
  return reportData.value.summary.find((k: any) => 
    k.label?.includes("خصم") || k.label?.includes("discount") || k.label?.includes("Discount")
  ) || null;
});

const totalDiscountsWithUnpaid = computed(() => {
  if (!discountKpi.value) return null;
  const discountValue = Number(discountKpi.value.value || 0);
  return discountValue + totalUnpaid.value;
});

async function fetchData() {
  pending.value = true;
  error.value = null;
  try {
    const now = new Date();
    const params: Record<string, any> = {
      type: props.reportType,
      date_from: props.dateFrom || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
      date_to: props.dateTo || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    };
    if (props.locationId) {
      params.location_id = props.locationId;
    }
    const data = await $fetch("/api/reports", { query: params });
    reportData.value = data;
  } catch (e: any) {
    error.value = e;
  } finally {
    pending.value = false;
  }
}

watch(pending, (v) => emit("loading", v));

watch(
  [() => props.reportType, () => props.dateFrom, () => props.dateTo, () => props.locationId],
  fetchData,
  { immediate: true },
);

watch(() => props.refreshKey, fetchData);

const iconMap: Record<string, any> = {
  trending_up: TrendingUp,
  payments: Banknote,
  account_balance_wallet: Wallet,
  shopping_cart: ShoppingCart,
  truck: Truck,
  receipt: Receipt,
  users: Users,
  package: Package,
  shopping_bag: ShoppingBag,
  clipboard_list: ClipboardList,
  timer: Timer,
  user_check: UserCheck,
  activity: Activity,
  filter: Circle,
  file_warning: Package,
};

const getIcon = (name: string) => iconMap[name] || Circle;

const tableRef = ref<InstanceType<typeof ReportTable> | null>(null);

const handleExport = () => {
  tableRef.value?.exportToExcel();
};

const refresh = fetchData;
defineExpose({ refresh, handleExport });
</script>

<template>
  <div class="space-y-6">
    <!-- Loading -->
    <div v-if="pending && !reportData" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          v-for="i in 4"
          :key="i"
          class="bg-white border border-outline-variant rounded-xl p-5 space-y-3"
        >
          <Skeleton class="w-10 h-10 rounded-lg" />
          <Skeleton class="h-3 w-24" />
          <Skeleton class="h-6 w-32" />
        </div>
      </div>
      <Skeleton class="h-64 w-full rounded-xl" />
      <div class="bg-white border border-outline-variant rounded-xl overflow-hidden">
        <div class="p-4 space-y-3">
          <div v-for="i in 5" :key="i" class="flex gap-4">
            <Skeleton class="h-4 flex-1" />
            <Skeleton class="h-4 w-24" />
            <Skeleton class="h-4 w-20" />
            <Skeleton class="h-4 w-28" />
          </div>
        </div>
      </div>
    </div>

    <template v-else-if="reportData">
      <!-- Error -->
      <div
        v-if="reportData?.error"
        class="bg-error/10 border border-error/30 text-error px-5 py-4 rounded-xl"
      >
        <p class="font-bold">خطأ في تحميل التقرير</p>
        <p class="text-xs mt-1">{{ reportData.error }}</p>
      </div>

      <template v-else>
        <!-- KPI Summary Cards -->
        <div
          v-if="reportData.summary?.length"
          class="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <div
            v-for="kpi in reportData.summary"
            :key="kpi.label"
            class="bg-white border border-outline-variant rounded-xl p-5"
          >
            <div class="flex items-center gap-3 mb-2">
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center"
                :class="{
                  'bg-primary-container/20 text-primary':
                    kpi.color === 'primary',
                  'bg-error-container/20 text-error': kpi.color === 'error',
                  'bg-secondary-container/20 text-primary':
                    kpi.color === 'primary',
                  'bg-tertiary-container/20 text-tertiary':
                    kpi.color === 'tertiary',
                }"
              >
                <component :is="getIcon(kpi.icon)" class="w-5 h-5" />
              </div>
            </div>
            <p class="text-on-white-variant text-label-md">{{ kpi.label }}</p>
            <h3
              class="text-price-display font-bold"
              :class="{
                'text-primary': kpi.color === 'primary',
                'text-error': kpi.color === 'error',
                // 'text-secondary': kpi.color === 'primary',
                'text-tertiary': kpi.color === 'tertiary',
                'text-on-white': !kpi.color,
              }"
            >
              {{ typeof kpi.value === 'object' ? JSON.stringify(kpi.value) : kpi.value }}
            </h3>
            <!-- Show unpaid amount in discounts KPI -->
            <p v-if="reportType === 'sales' && isDiscountKpi(kpi.label) && totalUnpaid > 0" 
               class="text-xs text-error font-bold mt-1">
              + {{ totalUnpaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} ج.م غير مدفوع
            </p>
          </div>
        </div>

        <!-- Chart -->
        <ReportChart
          v-if="reportData.chart"
          :key="JSON.stringify(reportData.chart)"
          :chart="reportData.chart"
        />

        <!-- Table -->
        <ReportTable
          v-if="reportData.columns?.length"
          ref="tableRef"
          :columns="reportData.columns"
          :rows="reportData.rows"
          :title="reportData.title"
        />
      </template>
    </template>
  </div>
</template>

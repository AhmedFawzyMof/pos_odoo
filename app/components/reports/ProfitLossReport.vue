<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  Banknote,
  TrendingDown,
  AlertCircle,
} from "@lucide/vue";
import Skeleton from "@/components/ui/skeleton/Skeleton.vue";
import type { POSOrder, OrderListResponse } from "~/types/pos";
import { formatDate } from "~/lib/dateUtils";

const props = defineProps<{
  dateFrom: string;
  dateTo: string;
  refreshKey?: number;
  orderId?: number | null;
  terminalId?: number | null;
}>();

const emit = defineEmits<{ loading: [v: boolean] }>();

const pending = ref(false);
const error = ref<any>(null);
const allOrders = ref<POSOrder[]>([]);
const totalItems = ref(0);

const CURRENCY = "ج.م";

async function fetchAllOrders() {
  pending.value = true;
  error.value = null;
  allOrders.value = [];
  try {
    let page = 1;
    const limit = 300;
    let hasMore = true;

    while (hasMore) {
      const params: Record<string, any> = {
        page,
        limit,
        date_from: props.dateFrom || undefined,
        date_to: props.dateTo || undefined,
      };

      const res = await $fetch<OrderListResponse>("/api/orders", { query: params });

      if (!res?.success) {
        throw new Error(res?.message || "فشل جلب الطلبات");
      }

      allOrders.value = [...allOrders.value, ...(res.data || [])];
      totalItems.value = res.totalItems || 0;

      if (!res.data || res.data.length < limit || page >= (res.totalPages || 1)) {
        hasMore = false;
      } else {
        page++;
      }
    }
  } catch (e: any) {
    error.value = e;
  } finally {
    pending.value = false;
  }
}

watch(
  [() => props.dateFrom, () => props.dateTo, () => props.refreshKey],
  fetchAllOrders,
  { immediate: true },
);

const activeOrders = computed(() =>
  allOrders.value.filter(
    (o) => o.state !== "cancelled" && o.state !== "draft",
  ),
);

const totalSales = computed(() =>
  activeOrders.value.reduce((sum, o) => sum + o.amount_total, 0),
);

const totalDiscounts = computed(() =>
  activeOrders.value.reduce(
    (sum, o) => sum + (o.amount_discount || 0),
    0,
  ),
);

const totalUnpaid = computed(() =>
  activeOrders.value.reduce(
    (sum, o) => sum + Math.max(0, o.amount_total - o.amount_paid),
    0,
  ),
);

const totalPaid = computed(() =>
  activeOrders.value.reduce((sum, o) => sum + o.amount_paid, 0),
);

const netSales = computed(() => totalSales.value - totalDiscounts.value);

const completedCount = computed(() => activeOrders.value.length);

const cancelledCount = computed(
  () => allOrders.value.filter((o) => o.state === "cancelled").length,
);

const draftCount = computed(
  () => allOrders.value.filter((o) => o.state === "draft").length,
);

const fmt = (n: number) => n.toLocaleString("en-US");

const kpis = computed(() => [
  {
    label: "إجمالي المبيعات",
    value: `${fmt(totalSales.value)} ${CURRENCY}`,
    icon: Banknote,
    color: "primary",
  },
  {
    label: "الخصومات",
    value: `${fmt(totalDiscounts.value)} ${CURRENCY}`,
    icon: TrendingDown,
    color: "error",
  },
  {
    label: "صافي المبيعات",
    value: `${fmt(netSales.value)} ${CURRENCY}`,
    icon: Banknote,
    color: "primary",
  },
  {
    label: "المبلغ غير المدفوع",
    value: `${fmt(totalUnpaid.value)} ${CURRENCY}`,
    icon: AlertCircle,
    color: "error",
  },
]);
</script>

<template>
  <div class="space-y-6">
    <!-- Loading -->
    <div v-if="pending && allOrders.length === 0" class="space-y-6">
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
    </div>

    <template v-else>
      <!-- Error -->
      <div
        v-if="error"
        class="bg-error/10 border border-error/30 text-error px-5 py-4 rounded-xl"
      >
        <p class="font-bold">خطأ في تحميل التقرير</p>
        <p class="text-xs mt-1">{{ error?.message || error }}</p>
      </div>

      <template v-else>
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div
            v-for="kpi in kpis"
            :key="kpi.label"
            class="bg-white border border-outline-variant rounded-xl p-5"
          >
            <div class="flex items-center gap-3 mb-2">
              <div
                class="w-10 h-14 rounded-lg flex items-center justify-center"
                :class="{
                  'bg-primary-container/20 text-primary': kpi.color === 'primary',
                  'bg-error-container/20 text-error': kpi.color === 'error',
                }"
              >
                <component :is="kpi.icon" class="w-5 h-5" />
              </div>
            </div>
            <p class="text-on-white-variant text-label-md">{{ kpi.label }}</p>
            <h3
              class="text-price-display font-bold"
              :class="{
                'text-primary': kpi.color === 'primary',
                'text-error': kpi.color === 'error',
              }"
            >
              {{ kpi.value }}
            </h3>
          </div>
        </div>

        <!-- Summary Table -->
        <div class="bg-white border border-outline-variant rounded-xl overflow-hidden">
          <div class="p-5 border-b border-outline-variant">
            <h3 class="text-headline-sm font-bold">ملخص الربح / الخسارة</h3>
            <p class="text-on-white-variant text-sm mt-1">
              من {{ formatDate(dateFrom) }} إلى {{ formatDate(dateTo) }}
            </p>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-right border-collapse">
              <thead class="bg-white-low text-on-white-variant">
                <tr>
                  <th class="px-6 py-4 font-bold text-label-md">البند</th>
                  <th class="px-6 py-4 font-bold text-label-md text-left">المبلغ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/40">
                <tr class="hover:bg-white-low transition-colors">
                  <td class="px-6 py-4 font-bold">إجمالي المبيعات</td>
                  <td class="px-6 py-4 font-bold text-primary text-left">
                    {{ fmt(totalSales) }} {{ CURRENCY }}
                  </td>
                </tr>
                <tr class="hover:bg-white-low transition-colors">
                  <td class="px-6 py-4 font-bold text-error">الخصومات</td>
                  <td class="px-6 py-4 font-bold text-error text-left">
                    -{{ fmt(totalDiscounts) }} {{ CURRENCY }}
                  </td>
                </tr>
                <tr class="hover:bg-white-low transition-colors bg-primary/5">
                  <td class="px-6 py-4 font-bold text-primary">صافي المبيعات</td>
                  <td class="px-6 py-4 font-bold text-primary text-left">
                    {{ fmt(netSales) }} {{ CURRENCY }}
                  </td>
                </tr>
                <tr class="hover:bg-white-low transition-colors">
                  <td class="px-6 py-4 font-bold">المبلغ المدفوع</td>
                  <td class="px-6 py-4 font-bold text-left">
                    {{ fmt(totalPaid) }} {{ CURRENCY }}
                  </td>
                </tr>
                <tr class="hover:bg-white-low transition-colors">
                  <td class="px-6 py-4 font-bold text-error">المبلغ غير المدفوع</td>
                  <td class="px-6 py-4 font-bold text-error text-left">
                    {{ fmt(totalUnpaid) }} {{ CURRENCY }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Order Stats -->
          <div class="p-5 border-t border-outline-variant bg-white-low">
            <div class="grid grid-cols-3 gap-4 text-center">
              <div>
                <p class="text-label-md text-on-white-variant">إجمالي الطلبات</p>
                <p class="text-headline-sm font-bold">{{ completedCount }}</p>
              </div>
              <div>
                <p class="text-label-md text-on-white-variant">مسودات</p>
                <p class="text-headline-sm font-bold text-on-white-variant">{{ draftCount }}</p>
              </div>
              <div>
                <p class="text-label-md text-on-white-variant">ملغية</p>
                <p class="text-headline-sm font-bold text-error">{{ cancelledCount }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

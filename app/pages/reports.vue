<script setup lang="ts">
import { ref, computed, markRaw } from "vue";
import { LoaderCircle } from "@lucide/vue";
import ReportSidebar from "~/components/reports/ReportSidebar.vue";
import ReportFilters from "~/components/reports/ReportFilters.vue";
import ProfitLossReport from "~/components/reports/ProfitLossReport.vue";
import PurchasesSalesReport from "~/components/reports/PurchasesSalesReport.vue";
import TaxReport from "~/components/reports/TaxReport.vue";
import SuppliersCustomersReport from "~/components/reports/SuppliersCustomersReport.vue";
import CustomerGroupsReport from "~/components/reports/CustomerGroupsReport.vue";
import StockReport from "~/components/reports/StockReport.vue";
import DamagedStockReport from "~/components/reports/DamagedStockReport.vue";
import PopularProductsReport from "~/components/reports/PopularProductsReport.vue";
import ItemsReport from "~/components/reports/ItemsReport.vue";
import ProductPurchasesReport from "~/components/reports/ProductPurchasesReport.vue";
import ProductSalesReport from "~/components/reports/ProductSalesReport.vue";
import PurchasesReport from "~/components/reports/PurchasesReport.vue";
import SalesReport from "~/components/reports/SalesReport.vue";
import ExpensesReport from "~/components/reports/ExpensesReport.vue";
import ShiftReport from "~/components/reports/ShiftReport.vue";
import SalespersonReport from "~/components/reports/SalespersonReport.vue";
import ActivityLogReport from "~/components/reports/ActivityLogReport.vue";
import LatePaymentsReport from "~/components/reports/LatePaymentsReport.vue";
import { usePermissions } from "~/composables/usePermissions";

const route = useRoute();
const { canViewPage } = usePermissions();

if (import.meta.client) {
  if (!canViewPage(route.path)) {
    navigateTo('/')
  }
}

const now = new Date();
const defaultDateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
const defaultDateTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

const activeReport = ref("profit_loss");
const dateFrom = ref(defaultDateFrom);
const dateTo = ref(defaultDateTo);
const locationId = ref<number | null>(null);
const loading = ref(false);
const refreshKey = ref(0);

const reportComponents: Record<string, any> = {
  profit_loss: markRaw(ProfitLossReport),
  purchases_sales: markRaw(PurchasesSalesReport),
  tax: markRaw(TaxReport),
  suppliers_customers: markRaw(SuppliersCustomersReport),
  customer_groups: markRaw(CustomerGroupsReport),
  stock: markRaw(StockReport),
  damaged_stock: markRaw(DamagedStockReport),
  popular_products: markRaw(PopularProductsReport),
  items: markRaw(ItemsReport),
  product_purchases: markRaw(ProductPurchasesReport),
  product_sales: markRaw(ProductSalesReport),
  purchases: markRaw(PurchasesReport),
  sales: markRaw(SalesReport),
  expenses: markRaw(ExpensesReport),
  shift: markRaw(ShiftReport),
  salesperson: markRaw(SalespersonReport),
  activity_log: markRaw(ActivityLogReport),
  late_payments: markRaw(LatePaymentsReport),
};

const activeComponent = computed(() => reportComponents[activeReport.value]);

const reportTitles: Record<string, string> = {
  profit_loss: "الربح / الخسارة",
  purchases_sales: "مشتريات ومبيعات",
  tax: "الضرائب",
  suppliers_customers: "الموردين والعملاء",
  customer_groups: "مجموعات العملاء",
  stock: "المخزون",
  damaged_stock: "المخزون التالف",
  popular_products: "المنتجات الشائعة",
  items: "العناصر",
  product_purchases: "مشتريات المنتجات",
  product_sales: "مبيعات المنتجات",
  purchases: "المشتريات",
  sales: "المبيعات",
  expenses: "المصاريف",
  shift: "المناوبة",
  salesperson: "مندوب المبيعات",
  activity_log: "سجل النشاطات",
  late_payments: "المدفوعات المتأخرة",
};

const onLoading = (v: boolean) => {
  loading.value = v;
};

const activeReportRef = ref<any>(null);

const onExport = () => {
  activeReportRef.value?.handleExport?.();
};

const onRefresh = () => {
  refreshKey.value++;
};
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h2 class="text-headline-lg font-bold">{{ reportTitles[activeReport] || "التقارير" }}</h2>
    </div>

    <!-- Filters -->
    <ReportFilters
      v-model:date-from="dateFrom"
      v-model:date-to="dateTo"
      v-model:location-id="locationId"
      :active-report="activeReport"
      :loading="loading"
      @refresh="onRefresh"
      @export="onExport"
    />

    <!-- Main Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <!-- Report Content -->
      <div class="lg:col-span-3">
        <component
          :is="activeComponent"
          ref="activeReportRef"
          :key="activeReport"
          :date-from="dateFrom"
          :date-to="dateTo"
          :location-id="locationId"
          :refresh-key="refreshKey"
          @loading="onLoading"
        />
      </div>

      <!-- Report Sidebar -->
      <div class="lg:col-span-1">
        <div class="bg-white border border-outline-variant rounded-xl p-4 sticky top-24">
          <div class="mb-4 px-3">
            <h4 class="text-headline-sm font-bold">التقارير</h4>
          </div>
          <ReportSidebar
            :active-report="activeReport"
            @select="activeReport = $event"
          />
        </div>
      </div>
    </div>
  </div>
</template>

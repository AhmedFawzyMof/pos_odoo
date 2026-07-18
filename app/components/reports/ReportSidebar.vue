<script setup lang="ts">
import {
  FileText, TrendingUp, ArrowLeftRight, Receipt, Users,
  UserCog, Warehouse, Package, PackageOpen, ShoppingBag,
  ShoppingCart, List, ClipboardList, Banknote, Timer,
  UserCheck, Activity, AlertCircle,
} from "@lucide/vue";

export interface ReportEntry {
  id: string;
  title: string;
  icon: any;
}

export interface ReportCategory {
  name: string;
  icon: any;
  reports: ReportEntry[];
}

const props = defineProps<{
  activeReport: string;
}>();

const emit = defineEmits<{
  select: [id: string];
}>();

const categories: ReportCategory[] = [
  {
    name: "المالية",
    icon: FileText,
    reports: [
      { id: "profit_loss", title: "الربح / الخسارة", icon: TrendingUp },
      { id: "purchases_sales", title: "مشتريات ومبيعات", icon: ArrowLeftRight },
      { id: "tax", title: "الضرائب", icon: Receipt },
      { id: "expenses", title: "المصاريف", icon: Banknote },
      { id: "late_payments", title: "المدفوعات المتأخرة", icon: AlertCircle },
    ],
  },
  {
    name: "العملاء والموردين",
    icon: Users,
    reports: [
      { id: "suppliers_customers", title: "الموردين والعملاء", icon: Users },
      { id: "customer_groups", title: "مجموعات العملاء", icon: UserCog },
    ],
  },
  {
    name: "المخزون",
    icon: Warehouse,
    reports: [
      { id: "stock", title: "المخزون", icon: Package },
      { id: "damaged_stock", title: "المخزون التالف", icon: PackageOpen },
    ],
  },
  {
    name: "المنتجات",
    icon: ShoppingBag,
    reports: [
      { id: "popular_products", title: "المنتجات الشائعة", icon: TrendingUp },
      { id: "items", title: "العناصر", icon: List },
      { id: "product_purchases", title: "مشتريات المنتجات", icon: ShoppingCart },
      { id: "product_sales", title: "مبيعات المنتجات", icon: ShoppingBag },
    ],
  },
  {
    name: "المشتريات والمبيعات",
    icon: ClipboardList,
    reports: [
      { id: "purchases", title: "المشتريات", icon: ClipboardList },
      { id: "sales", title: "المبيعات", icon: TrendingUp },
    ],
  },
  {
    name: "العمليات",
    icon: Timer,
    reports: [
      { id: "shift", title: "المناوبة", icon: Timer },
      { id: "salesperson", title: "مندوب المبيعات", icon: UserCheck },
      { id: "activity_log", title: "سجل النشاطات", icon: Activity },
    ],
  },
];
</script>

<template>
  <div class="space-y-6">
    <div v-for="cat in categories" :key="cat.name" class="space-y-1">
      <div class="flex items-center gap-2 px-3 py-2">
        <component :is="cat.icon" class="w-4 h-4 text-on-white-variant" />
        <span class="text-label-md font-bold text-on-white-variant">{{ cat.name }}</span>
      </div>
      <button
        v-for="rep in cat.reports"
        :key="rep.id"
        @click="emit('select', rep.id)"
        class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-right"
        :class="activeReport === rep.id
          ? 'bg-primary text-white shadow-md shadow-primary/20'
          : 'text-on-white hover:bg-white-low hover:text-primary'"
      >
        <component :is="rep.icon" class="w-4 h-4 shrink-0" />
        <span>{{ rep.title }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  CloudOff,
  LayoutGrid,
  Receipt,
  Landmark,
  Warehouse,
  ShoppingBag,
  Users,
  History,
  Truck,
  ClipboardList,
  TrendingUp,
  Banknote,
  Wallet,
  ShoppingCart,
  Circle,
} from "@lucide/vue";
import Skeleton from "@/components/ui/skeleton/Skeleton.vue";
const route = useRoute();

const kpiIconMap: Record<string, any> = {
  trending_up: TrendingUp,
  payments: Banknote,
  account_balance_wallet: Wallet,
  shopping_cart: ShoppingCart,
  inventory: Warehouse,
  group: Users,
  receipt_long: Receipt,
  point_of_sale: Receipt,
  account_balance: Landmark,
  inventory_2: Warehouse,
  history: History,
};

const getKpiIcon = (name: string) => kpiIconMap[name] || Circle;

const { data, error, status, pending } = useFetch("/api/kpi/dashboard", {
  lazy: true,
});

const kpis = computed(() => data.value?.kpis || []);

const modules = [
  {
    name: "نقطة البيع (POS)",
    description: "واجهة سريعة وبسيطة لعمليات البيع اليومية وقبول المدفوعات.",
    path: "/pos",
    icon: Receipt,
    bg: "bg-primary-container/10",
    color: "text-primary",
  },
  {
    name: "الحسابات والمحاسبة",
    description: "تسجيل المعاملات المالية، الفواتير، التقارير والضرائب.",
    path: "/accounting",
    icon: Landmark,
    bg: "bg-indigo-500/10",
    color: "text-indigo-600",
  },
  {
    name: "المستودعات والمخزون",
    description: "متابعة مستويات المخزون، الشحنات الواردة وحركات النقل.",
    path: "/warehouse",
    icon: Warehouse,
    bg: "bg-amber-500/10",
    color: "text-amber-600",
  },
  {
    name: "إدارة المنتجات",
    description: "إضافة المنتجات الجديدة، تحديث الأسعار والـ SKU.",
    path: "/products",
    icon: ShoppingBag,
    bg: "bg-emerald-500/10",
    color: "text-emerald-600",
  },
  {
    name: "أقسام المنتجات",
    description: "تنظيم شجرة الأقسام والفئات لتسهيل البحث والبيع.",
    path: "/categories",
    icon: LayoutGrid,
    bg: "bg-sky-500/10",
    color: "text-sky-600",
  },
  {
    name: "العملاء والشركاء",
    description: "إدارة بيانات العملاء، الحسابات الآجلة وبرامج الولاء.",
    path: "/customers",
    icon: Users,
    bg: "bg-rose-500/10",
    color: "text-rose-600",
  },
  {
    name: "سجل الطلبات",
    description: "تاريخ الفواتير الصادرة، عمليات الإرجاع والطلب المعلق.",
    path: "/orders",
    icon: History,
    bg: "bg-teal-500/10",
    color: "text-teal-600",
  },
  {
    name: "الموردين",
    description: "إدارة الموردين، متابعة الحسابات وطلبات الشراء.",
    path: "/suppliers",
    icon: Truck,
    bg: "bg-orange-500/10",
    color: "text-orange-600",
  },
  {
    name: "قائمة مشترايات",
    description: "إنشاء ومتابعة قائمة مشترايات للمخزون والمواد.",
    path: "/purchase-orders",
    icon: ClipboardList,
    bg: "bg-cyan-500/10",
    color: "text-cyan-600",
  },
];
</script>

<template>
  <div class="space-y-8">
    <div
      v-if="pending && !data?.kpis"
      class="space-y-8"
    >
      <div class="bg-primary/10 p-8 rounded-2xl">
        <Skeleton class="h-8 w-64 mb-2" />
        <Skeleton class="h-4 w-96" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          v-for="i in 4"
          :key="i"
          class="bg-white border border-outline-variant rounded-xl p-6 space-y-4"
        >
          <div class="flex items-center justify-between">
            <Skeleton class="w-12 h-12 rounded-lg" />
            <Skeleton class="h-5 w-16 rounded" />
          </div>
          <div class="space-y-2">
            <Skeleton class="h-3 w-24" />
            <Skeleton class="h-7 w-32" />
          </div>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- Connection error banner -->
      <Transition name="fade">
        <div
          v-if="status === 'error' || (status === 'success' && !data?.kpis)"
          class="flex items-center gap-3 bg-error/10 border border-error/30 text-error px-5 py-4 rounded-xl"
        >
          <CloudOff class="w-6 h-6 shrink-0" />
          <div>
            <p class="font-bold text-sm">فشل جلب بيانات لوحة التحكم</p>
            <p class="text-xs opacity-75 font-mono mt-0.5">
              {{ error?.message || "تعذر الاتصال بالخادم" }}
            </p>
          </div>
        </div>
      </Transition>
      <!-- Welcome Header Banner -->
      <div
        class="bg-primary text-white p-8 rounded-2xl relative overflow-hidden shadow-md"
      >
        <div class="relative z-10 max-w-xl">
          <h3 class="text-display-lg font-bold mb-2">
            مرحباً بك في easyweb POS
          </h3>
          <p class="text-body-lg opacity-90">
            من هنا يمكنك الوصول إلى جميع الأدوات الذكية لإدارة البيع بالتجزئة،
            المحاسبة، وتحديث المستودعات بكفاءة وسرعة.
          </p>
        </div>
        <div
          class="absolute -bottom-6 left-6 opacity-10 text-[160px] select-none font-black hidden md:block"
        >
          easyweb
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          v-for="kpi in kpis"
          :key="kpi.title"
          class="bg-white border border-outline-variant rounded-xl p-6 flex flex-col justify-between hover:shadow-md transition-all group"
        >
          <div class="flex justify-between items-start">
            <div
              class="w-12 h-12 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
              :class="[
                kpi.color === 'primary'
                  ? 'bg-primary-container/20 text-primary'
                  : '',
                kpi.color === 'error' ? 'bg-error-container/20 text-error' : '',
                kpi.color === 'secondary'
                  ? 'bg-secondary-container/20 text-secondary'
                  : '',
                kpi.color === 'tertiary'
                  ? 'bg-tertiary-container/20 text-tertiary'
                  : '',
              ]"
            >
              <component :is="getKpiIcon(kpi.icon)" class="w-7 h-7" />
            </div>
            <span
              class="text-label-md font-bold px-2 py-1 rounded"
              :class="[
                kpi.changeType === 'positive'
                  ? 'bg-primary-container/10 text-primary'
                  : '',
                kpi.changeType === 'negative'
                  ? 'bg-error-container/10 text-error'
                  : '',
                kpi.changeType === 'warning'
                  ? 'bg-amber-500/10 text-amber-600'
                  : '',
              ]"
            >
              {{ kpi.change }}
            </span>
          </div>
          <div class="mt-4">
            <p class="text-on-white-variant font-label-md text-label-md">
              {{ kpi.title }}
            </p>
            <h3
              class="text-price-display font-bold mt-1"
              :class="
                kpi.color === 'primary' ? 'text-primary' : 'text-on-white'
              "
            >
              {{ kpi.value }}
            </h3>
          </div>
        </div>
      </div>

      <!-- Navigation Hub Grid -->
      <div>
        <h3 class="text-headline-md font-bold mb-6 flex items-center gap-2">
          <LayoutGrid class="w-6 h-6 text-primary" />
          الوصول السريع للأقسام
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NuxtLink
            v-for="mod in modules"
            :key="mod.name"
            :to="mod.path"
            class="bg-white border border-outline-variant p-6 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-98 flex gap-4 group"
          >
            <div
              class="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
              :class="mod.bg"
            >
              <component :is="mod.icon" class="w-7 h-7" :class="mod.color" />
            </div>
            <div class="space-y-1">
              <h4
                class="font-bold text-body-lg text-on-white group-hover:text-primary transition-colors"
              >
                {{ mod.name }}
              </h4>
              <p class="text-label-md text-on-white-variant leading-relaxed">
                {{ mod.description }}
              </p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>

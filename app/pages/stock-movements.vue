<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import {
  Warehouse,
  ChevronLeft,
  ChevronRight,
  History,
  Download,
  ArrowLeft,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RefreshCw,
  FileX2,
} from "@lucide/vue";
import * as XLSX from "@sheetjs/xlsx";
import { usePermissions } from "~/composables/usePermissions";

const route = useRoute();
const { canViewPage } = usePermissions();

if (import.meta.client) {
  if (!canViewPage(route.path)) {
    navigateTo('/')
  }
}

const router = useRouter();

interface StockMovement {
  id: string;
  date: string;
  time: string;
  productName: string;
  sku: string;
  type: string;
  typeLabel: string;
  origin: string;
  fromLocation: string;
  toLocation: string;
  qty: number;
  operator: string;
  status: string;
  statusLabel: string;
}

const productId = computed(() => route.query.productId as string || route.params.productId as string || route.params.id as string || "");

const searchQuery = ref("");
const debouncedSearch = ref("");
const selectedType = ref("all");
const dateFrom = ref("");
const dateTo = ref("");
const currentPage = ref(1);
const itemsPerPage = 26;

let searchTimeout: ReturnType<typeof setTimeout>;
watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    debouncedSearch.value = searchQuery.value;
    currentPage.value = 1;
  }, 400);
});

watch([selectedType, dateFrom, dateTo, productId], () => {
  currentPage.value = 1;
});

const {
  data: apiResponse,
  status,
  refresh,
} = useFetch<{
  success: boolean;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  data: StockMovement[];
}>("/api/stock-movements", {
  lazy: true,
  query: {
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearch,
    type: selectedType,
    dateFrom,
    dateTo,
    productId,
  },
  watch: [currentPage, debouncedSearch, selectedType, dateFrom, dateTo, productId],
  transform: (response) => {
    if (!response.data) response.data = [];
    return response;
  },
});

const movements = computed(() => apiResponse.value?.data || []);
const totalItems = computed(() => apiResponse.value?.totalItems || 0);
const totalPages = computed(() => apiResponse.value?.totalPages || 1);

const productName = computed(() => {
  if (productId.value && movements.value.length > 0) {
    return movements.value[0].productName;
  }
  return "";
});

const paginatedMovements = movements;

function originBadgeClass(origin?: string): Record<string, boolean> {
  const o = origin || '';
  return {
    'bg-sky-100 text-sky-700': o.includes('طلب بيع'),
    'bg-amber-100 text-amber-700': o.includes('أمر شراء'),
    'bg-purple-100 text-purple-700': o.includes('جرد'),
    'bg-slate-100 text-slate-600': !o.includes('طلب بيع') && !o.includes('أمر شراء') && !o.includes('جرد'),
  };
}

const setPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page;
};

const pageNumbers = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  const pages: (number | "...")[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }
  pages.push(1);
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
});

const triggerExport = async () => {
  try {
    const res = await $fetch<{
      success: boolean;
      totalItems: number;
      data: StockMovement[];
    }>("/api/stock-movements", {
      query: {
        page: 1,
        limit: 100000,
        search: debouncedSearch.value,
        type: selectedType.value,
        dateFrom: dateFrom.value,
        dateTo: dateTo.value,
        productId: productId.value || undefined,
      },
    });
    if (!res.success || !res.data?.length) {
      alert("لا توجد حركات مخزون للتصدير بناءً على الفلاتر المحددة.");
      return;
    }
    const rows = res.data.map((m) => ({
      "معرف الحركة": m.id,
      التاريخ: m.date,
      الوقت: m.time,
      المنتج: m.productName,
      "كود SKU": m.sku,
      "نوع الحركة": m.typeLabel,
      المصدر: m.origin,
      "من موقع": m.fromLocation,
      "إلى موقع": m.toLocation,
      الكمية: m.qty,
      المسؤول: m.operator,
      الحالة: m.statusLabel,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "حركات المخزون");
    XLSX.writeFile(
      wb,
      `حركات_المخزون_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  } catch {
    alert("فشل تصدير التقرير. يرجى المحاولة مرة أخرى.");
  }
};
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto" dir="rtl">
    <!-- Top Breadcrumbs Header Navigation -->
    <div
      class="flex items-center gap-2 text-label-md text-on-white-variant mb-2"
    >
      <NuxtLink
        :to="productId ? '/products' : '/warehouse'"
        class="hover:text-primary transition-colors flex items-center gap-1 font-bold"
      >
        <Warehouse class="w-[18px] h-[18px]" />
        {{ productId ? 'المنتجات' : 'المخازن والمواقع' }}
      </NuxtLink>
      <ChevronLeft class="w-[14px] h-[14px]" />
      <span class="text-on-white" v-if="productName">حركات المخزون لـ {{ productName }}</span>
      <span class="text-on-white" v-else>حركات المخزون الأخيرة</span>
    </div>

    <!-- Main Header Action Bar -->
    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
    >
      <div>
        <h1
          class="text-headline-lg font-bold text-on-white flex items-center gap-3"
        >
          <span
            class="bg-primary/10 p-2.5 rounded-2xl inline-flex items-center justify-center"
            ><History class="w-6 h-6 text-primary"
          /></span>
          <template v-if="productName">حركات المخزون لـ {{ productName }}</template>
          <template v-else>سجل حركات المخزون الكامل</template>
        </h1>
        <p class="text-label-md text-on-white-variant mt-1">
          <template v-if="productName">
            سجل حركات المخزون الواردة والصادرة والتحويلات لهذا المنتج
          </template>
          <template v-else>
            دفتر الأستاذ وحركات جرد المستودعات الواردة، الصادرة والتحويلات
            الداخلية بالتفصيل
          </template>
        </p>
      </div>

      <!-- Export & Print Quick actions -->
      <div class="flex gap-2">
        <button
          @click="triggerExport"
          class="h-11 px-4 border border-outline-variant bg-white hover:bg-white rounded-lg text-label-md font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer text-on-white"
        >
          <Download class="w-[20px] h-[20px] text-primary" />
          تصدير التقرير
        </button>
        <button
          @click="router.push(productId ? '/products' : '/warehouse')"
          class="h-11 px-4 bg-primary text-white rounded-lg text-label-md font-bold flex items-center gap-2 hover:bg-primary/90 transition-all active:scale-95 cursor-pointer shadow-sm"
        >
          <ArrowLeft class="w-[20px] h-[20px]" />
          {{ productId ? 'الرجوع للمنتجات' : 'الرجوع للمخزن' }}
        </button>
      </div>
    </div>

    <!-- Filter and Search Area -->
    <div
      class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center bg-white p-4 rounded-xl border border-outline-variant shadow-sm"
    >
      <!-- Search Input -->
      <div class="relative lg:col-span-1">
        <Search
          class="absolute right-3 top-1/2 -translate-y-1/2 text-on-white-variant w-5 h-5"
        />
        <input
          v-model="searchQuery"
          class="w-full h-11 pr-10 pl-4 bg-white rounded-full border-none focus:ring-2 focus:ring-primary text-label-md outline-none text-right"
          placeholder="بحث بالمنتج، الكود، الموقع أو المستودع..."
          type="text"
        />
      </div>

      <!-- Movement Type Segment Filter Buttons -->
      <div
        class="lg:col-span-2 flex flex-wrap gap-2 justify-start md:justify-end"
      >
        <button
          @click="selectedType = 'all'"
          class="h-10 px-4 rounded-full text-label-md font-bold transition-all duration-200 cursor-pointer"
          :class="
            selectedType === 'all'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white hover:bg-white-high text-on-white-variant border border-outline-variant'
          "
        >
          الكل
        </button>
        <button
          @click="selectedType = 'incoming'"
          class="h-10 px-4 rounded-full text-label-md font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
          :class="
            selectedType === 'incoming'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white hover:bg-white-high text-on-white-variant border border-outline-variant'
          "
        >
          <ArrowDownLeft class="w-[18px] h-[18px]" />
          الواردات (+)
        </button>
        <button
          @click="selectedType = 'outgoing'"
          class="h-10 px-4 rounded-full text-label-md font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
          :class="
            selectedType === 'outgoing'
              ? 'bg-error text-white shadow-sm'
              : 'bg-white hover:bg-white-high text-on-white-variant border border-outline-variant'
          "
        >
          <ArrowUpRight class="w-[18px] h-[18px]" />
          الصادرات (-)
        </button>
        <button
          @click="selectedType = 'transfer'"
          class="h-10 px-4 rounded-full text-label-md font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
          :class="
            selectedType === 'transfer'
              ? 'bg-primary-container text-primary shadow-sm border border-primary/20'
              : 'bg-white hover:bg-white-high text-on-white-variant border border-outline-variant'
          "
        >
          <ArrowLeftRight class="w-[18px] h-[18px]" />
          التحويلات (⇄)
        </button>
      </div>

      <!-- Date Range Filters -->
      <div
        class="lg:col-span-3 flex flex-wrap items-center gap-3 pt-2 border-t border-outline-variant/50"
      >
        <span class="text-label-md text-on-white-variant font-bold"
          >تصفية بالتاريخ:</span
        >
        <div class="relative">
          <input
            v-model="dateFrom"
            type="date"
            class="h-10 px-3 bg-white rounded-lg border border-outline-variant text-label-md outline-none focus:ring-2 focus:ring-primary text-right"
          />
        </div>
        <span class="text-on-white-variant">إلى</span>
        <div class="relative">
          <input
            v-model="dateTo"
            type="date"
            class="h-10 px-3 bg-white rounded-lg border border-outline-variant text-label-md outline-none focus:ring-2 focus:ring-primary text-right"
          />
        </div>
      </div>
    </div>

    <!-- Ledger Movements Table Grid -->
    <div
      class="bg-white rounded-2xl border border-outline-variant overflow-hidden flex flex-col shadow-sm"
    >
      <div class="overflow-x-auto custom-scrollbar">
        <table class="w-full text-right border-collapse">
          <thead>
            <tr
              class="bg-white text-on-white-variant border-b border-outline-variant"
            >
              <th class="px-6 py-4 font-bold text-label-md">معرف الحركة</th>
              <th class="px-6 py-4 font-bold text-label-md">التاريخ والوقت</th>
              <th class="px-6 py-4 font-bold text-label-md">المنتج</th>
              <th class="px-6 py-4 font-bold text-label-md">نوع الحركة</th>
              <th class="px-6 py-4 font-bold text-label-md">المصدر</th>
              <th class="px-6 py-4 font-bold text-label-md">من موقع</th>
              <th class="px-6 py-4 font-bold text-label-md">إلى موقع</th>
              <th class="px-6 py-4 font-bold text-label-md">الكمية</th>
              <th class="px-6 py-4 font-bold text-label-md">المسؤول</th>
              <th class="px-6 py-4 font-bold text-label-md">الحالة</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant">
            <tr
              v-for="mv in paginatedMovements"
              :key="mv.id"
              class="hover:bg-white-low transition-colors group"
            >
              <!-- ID -->
              <td
                class="px-6 py-4 font-mono text-label-md font-semibold text-primary"
              >
                {{ mv.id }}
              </td>

              <!-- Date & Time -->
              <td class="px-6 py-4">
                <p class="font-bold text-on-white text-body-md">
                  {{ mv.date }}
                </p>
                <p class="text-[12px] text-on-white-variant font-mono">
                  {{ mv.time }}
                </p>
              </td>

              <!-- Product -->
              <td class="px-6 py-4">
                <p class="font-bold text-on-white text-body-md">
                  {{ mv.productName }}
                </p>
                <p class="text-[12px] text-on-white-variant font-mono">
                  SKU: {{ mv.sku }}
                </p>
              </td>

              <!-- Type Badge -->
              <td class="px-6 py-4 text-xs">
                <span
                  class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-label-md font-bold"
                  :class="[
                    mv.type === 'incoming'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : '',
                    mv.type === 'outgoing' ? 'bg-error/10 text-error' : '',
                    mv.type === 'transfer' ? 'bg-primary/10 text-primary' : '',
                  ]"
                >
                  <component
                    :is="
                      mv.type === 'incoming'
                        ? ArrowDownLeft
                        : mv.type === 'outgoing'
                          ? ArrowUpRight
                          : ArrowLeftRight
                    "
                    class="w-[16px] h-[16px]"
                  />
                  {{ mv.typeLabel }}
                </span>
              </td>

              <!-- Source / Origin -->
              <td class="px-6 py-4 text-on-white-variant text-label-md">
                <span
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold"
                  :class="originBadgeClass(mv.origin)"
                >
                  {{ mv.origin }}
                </span>
              </td>

              <!-- From Location -->
              <td
                class="px-6 py-4 text-on-white-variant text-label-md font-mono"
              >
                {{ mv.fromLocation }}
              </td>

              <!-- To Location -->
              <td
                class="px-6 py-4 text-on-white-variant text-label-md font-mono"
              >
                {{ mv.toLocation }}
              </td>

              <!-- Quantity -->
              <td class="px-6 py-4 font-bold text-body-lg">
                <span :class="[mv.qty > 0 ? 'text-emerald-600' : 'text-error']">
                  {{ mv.qty > 0 ? "+" : "" }}{{ mv.qty }}
                </span>
              </td>

              <!-- Operator -->
              <td class="px-6 py-4 text-on-white text-label-md">
                {{ mv.operator }}
              </td>

              <!-- Status -->
              <td class="px-6 py-4">
                <span
                  class="bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 rounded text-xs"
                >
                  {{ mv.statusLabel }}
                </span>
              </td>
            </tr>
            <tr v-if="status === 'pending' && !paginatedMovements.length">
              <td colspan="10" class="p-12 text-center text-on-white-variant">
                <RefreshCw
                  class="w-9 h-9 block mb-2 animate-spin text-primary mx-auto"
                />
                جاري تحميل حركات المخزون...
              </td>
            </tr>
            <tr v-else-if="paginatedMovements.length === 0">
              <td colspan="10" class="p-12 text-center text-on-white-variant">
                <FileX2 class="w-9 h-9 block mb-2 text-outline mx-auto" />
                لا توجد حركات مخزون تطابق البحث المختار.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer Controls -->
      <div
        class="px-8 py-4 bg-white-low border-t border-outline-variant flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0"
      >
        <p class="text-label-md text-on-white-variant">
          عرض حركات {{ (currentPage - 1) * itemsPerPage + 1 }}-{{
            Math.min(currentPage * itemsPerPage, totalItems)
          }}
          من أصل {{ totalItems }} حركة مسجلة
        </p>

        <div class="flex gap-2">
          <!-- Previous Page -->
          <button
            @click="setPage(currentPage - 1)"
            :disabled="currentPage === 1"
            class="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-white text-on-white-variant disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
          >
            <ChevronLeft class="w-5 h-5" />
          </button>

          <!-- Pages loops -->
          <template v-for="p in pageNumbers" :key="p">
            <span
              v-if="p === '...'"
              class="w-10 h-10 flex items-center justify-center text-on-white-variant"
            >
              ...
            </span>
            <button
              v-else
              @click="setPage(p)"
              class="w-10 h-10 rounded-lg border font-bold cursor-pointer"
              :class="
                currentPage === p
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'border-outline-variant hover:bg-white text-on-white'
              "
            >
              {{ p }}
            </button>
          </template>

          <!-- Next Page -->
          <button
            @click="setPage(currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-white text-on-white-variant disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
          >
            <ChevronRight class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

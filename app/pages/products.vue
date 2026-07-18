<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  Search,
  RefreshCw,
  Plus,
  CloudOff,
  AlertCircle,
  X,
  CheckCheck,
  LoaderCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Package,
  DollarSign,
  Tag,
  MapPin,
  Layers,
} from "@lucide/vue";
import ProductsTable from "~/components/products/ProductsTable.vue";
import ProductDrawer from "~/components/products/ProductDrawer.vue";
import type { Product, POSCategory } from "~/types/product";
import { usePermissions } from "~/composables/usePermissions";

const route = useRoute();
const { can, canViewPage } = usePermissions();

if (import.meta.client) {
  if (!canViewPage(route.path)) {
    navigateTo("/");
  }
}

const currentPage = ref(1);
const pageSize = ref(28);
const pageSizeOptions = [28, 100, 300, 500];

const searchQuery = ref("");
const archiveFilter = ref<"all" | "active" | "archived">("all");
const negativeStockFilter = ref(false);
type SortField = "qty_available" | "standard_price" | "list_price";
type SortOrder = "asc" | "desc";
const sortField = ref<SortField>("qty_available");
const sortOrder = ref<SortOrder>("desc");

const selectedLocationId = ref<number | null>(null);
const activeCategoryId = ref<number | null>(null);

const categories = ref<POSCategory[]>([]);
const locations = ref<{ id: number; name: string }[]>([]);

const {
  data: apiResponse,
  status,
  error,
  refresh,
  pending,
} = useFetch<{
  success: boolean;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  data: Product[];
  categories?: POSCategory[];
  locations?: { id: number; name: string }[];
}>("/api/products/all", {
  lazy: true,
  query: {
    page: currentPage,
    limit: pageSize,
    archiveFilter,
    search: searchQuery,
    locationId: selectedLocationId,
    categoryId: activeCategoryId,
    negativeStock: negativeStockFilter,
  },
  watch: [
    currentPage,
    pageSize,
    archiveFilter,
    searchQuery,
    selectedLocationId,
    activeCategoryId,
    negativeStockFilter,
  ],
  transform: (response) => {
    if (!response.data) response.data = [];
    if (response.categories) categories.value = response.categories;
    if (response.locations) locations.value = response.locations;
    return response;
  },
});

watch(archiveFilter, () => {
  currentPage.value = 1;
});

watch(selectedLocationId, () => {
  currentPage.value = 1;
});

watch(activeCategoryId, () => {
  currentPage.value = 1;
});

watch(negativeStockFilter, () => {
  currentPage.value = 1;
});

let searchDebounce: ReturnType<typeof setTimeout>;
watch(searchQuery, () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    currentPage.value = 1;
  }, 300);
});

const products = computed<Product[]>(() => apiResponse.value?.data || []);
const totalPages = computed(() => apiResponse.value?.totalPages || 1);
const totalItems = computed(() => apiResponse.value?.totalItems || 0);

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

const sortLabels: Record<SortField, string> = {
  qty_available: "المخزون",
  standard_price: "سعر الشراء",
  list_price: "سعر البيع",
};

const toggleSort = (field: SortField) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortField.value = field;
    sortOrder.value = "desc";
  }
};

const sortedProducts = computed(() => {
  return [...products.value].sort((a, b) => {
    const aVal = a[sortField.value] ?? 0;
    const bVal = b[sortField.value] ?? 0;
    return sortOrder.value === "asc"
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });
});

// Drawer System Management
const drawerOpen = ref(false);
const drawerMode = ref<"add" | "edit">("add");
const selectedProduct = ref<Product | null>(null);
const isSaving = ref(false);
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

const liveStockLoading = ref(false);

const checkLiveStock = async () => {
  if (liveStockLoading.value) return;
  const ids = products.value.map((p) => p.id).filter(Boolean) as number[];
  if (!ids.length) return;
  liveStockLoading.value = true;
  try {
    const res = await $fetch<{
      success: boolean;
      stockMap: Record<
        number,
        { qty_available: number; stock_locations: any[] }
      >;
    }>("/api/products/stock", {
      method: "POST",
      body: { ids },
    });
    if (res.success && res.stockMap) {
      for (const prod of products.value) {
        if (prod.id && res.stockMap[prod.id]) {
          const s = res.stockMap[prod.id];
          prod.qty_available = s?.qty_available ?? 0;
          prod.stock_locations = s?.stock_locations ?? [];
        }
      }
    }
  } catch (err: any) {
    console.error("Failed to fetch live stock:", err);
  } finally {
    liveStockLoading.value = false;
  }
};

const handleViewStockMovements = (product: Product) => {
  if (product.id) {
    navigateTo(`/stock-movements/product/${product.id}`);
  }
};

const openAddDrawer = () => {
  drawerMode.value = "add";
  selectedProduct.value = null;
  drawerOpen.value = true;
};

const handleEdit = (product: Product) => {
  drawerMode.value = "edit";
  selectedProduct.value = product;
  drawerOpen.value = true;
};

const handleDelete = async (product: Product) => {
  const targetProduct = product;
  if (!targetProduct || !targetProduct.id) {
    alert("لم يتم العثور على معرّف هذا المنتج بالنظام");
    return;
  }

  if (
    confirm(
      `⚠️ تحذير: هل أنت متأكد من رغبتك في حذف منتج "${targetProduct.name}" نهائياً من النظام؟ لا يمكن التراجع عن هذه الخطوة.`,
    )
  ) {
    try {
      isSaving.value = true;

      const response = await $fetch<{ success: boolean; message: string }>(
        "/api/products/delete",
        {
          method: "DELETE",
          body: { id: targetProduct.id },
        },
      );

      if (response.success) {
        await refresh();
        drawerOpen.value = false;
      }
    } catch (err: any) {
      console.error(err);
      showToastMessage(
        err.message ||
          err.statusMessage ||
          "خطأ في الاتصال بالنظام، لم يتم حذف المنتج.",
        "error",
      );
    } finally {
      isSaving.value = false;
    }
  }
};

const handleSave = async (
  payload: Partial<Product> & { variants?: any[]; image_1920?: string | null },
) => {
  isSaving.value = true;

  try {
    const response = await $fetch<{
      success: boolean;
      message: string;
      id: number;
    }>("/api/products/save", {
      method: "POST",
      body: payload,
    });

    if (response.success) {
      await refresh();
      drawerOpen.value = false;
    }
  } catch (err: any) {
    console.error("Failed to preserve modifications:", err);
    showToastMessage(
      err.message ||
        err.statusMessage ||
        "فشل في حفظ المنتج. يرجى المحاولة مجدداً.",
      "error",
    );
  } finally {
    isSaving.value = false;
  }
};

const handleRestore = async (product: Product) => {
  if (!product || !product.id) return;
  if (!confirm(`هل أنت متأكد من استعادة المنتج "${product.name}"؟`)) return;

  try {
    isSaving.value = true;
    const response = await $fetch<{ success: boolean; message: string }>(
      "/api/products/unarchive",
      { method: "POST", body: { id: product.id } },
    );
    if (response.success) {
      await refresh();
    }
  } catch (err: any) {
    console.error("Failed to restore product:", err);
    showToastMessage(
      err.message || err.statusMessage || "فشل في استعادة المنتج.",
      "error",
    );
  } finally {
    isSaving.value = false;
  }
};

const handleDeleteFromDrawer = async () => {
  if (selectedProduct.value) {
    isSaving.value = true;

    const isArchived = selectedProduct.value.active === false;
    const endpoint = isArchived
      ? "/api/products/unarchive"
      : "/api/products/archive";

    try {
      const response = await $fetch<{
        success: boolean;
        message: string;
        id: number;
      }>(endpoint, {
        method: "POST",
        body: { id: selectedProduct.value?.id },
      });

      if (response.success) {
        await refresh();
        drawerOpen.value = false;
      }
    } catch (err: any) {
      console.error("Failed to update product archive status:", err);
      showToastMessage(
        err.message ||
          err.statusMessage ||
          "فشل في تغيير حالة المنتج. يرجى المحاولة مجدداً.",
        "error",
      );
    } finally {
      isSaving.value = false;
    }
  }
};
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <div
      class="flex flex-col justify-between items-stretch sm:items-center gap-4 bg-white p-4 rounded-xl border border-outline-variant shadow-sm"
    >
      <div class="flex items-center gap-2 w-full flex-wrap sm:flex-nowrap">
        <select
          v-model="pageSize"
          class="h-9 px-3 rounded-full border border-outline-variant bg-white text-label-md text-on-white outline-none focus:ring-2 focus:ring-primary cursor-pointer"
        >
          <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">
            {{ opt }} / صفحة
          </option>
        </select>
        <button
          @click="refresh()"
          class="p-2.5 rounded-full border border-outline-variant hover:bg-white transition-all active:scale-95 text-on-white-variant cursor-pointer flex items-center justify-center"
          title="تحديث البيانات"
        >
          <RefreshCw
            :class="{ 'animate-spin': status === 'pending' }"
            class="w-5 h-5"
          />
        </button>
        <button
          @click="checkLiveStock"
          :disabled="liveStockLoading"
          class="flex items-center gap-1.5 px-3 py-2 rounded-full border border-success/40 text-success bg-success/5 hover:bg-success/10 transition-all active:scale-95 cursor-pointer disabled:opacity-50 text-label-md font-bold"
          title="تحديث المخزون المباشر"
        >
          <RefreshCw
            :class="{ 'animate-spin': liveStockLoading }"
            class="w-4 h-4"
          />
          <span>المخزون المباشر</span>
        </button>
        <button
          v-if="can('product.create')"
          @click="openAddDrawer"
          class="text-white flex items-center justify-center gap-2 bg-primary px-6 py-2.5 rounded-full font-bold hover:bg-primary/95 transition-all active:scale-95 cursor-pointer shadow-sm"
        >
          <Plus class="w-5 h-5" />
          إضافة منتج جديد
        </button>
      </div>
      <div class="flex w-full gap-4 flex-wrap sm:flex-nowrap">
        <div class="relative flex-1 max-w-md">
          <Search
            class="absolute right-3 top-1/2 -translate-y-1/2 text-on-white-variant w-5 h-5"
          />
          <input
            v-model="searchQuery"
            class="w-full h-11 pr-10 pl-4 bg-white rounded-full border-none focus:ring-2 focus:ring-primary text-label-md outline-none"
            placeholder="بحث بالاسم، الباركود، أو التصنيف..."
            type="text"
          />
        </div>
        <div
          class="flex items-center gap-1 bg-white-low rounded-full p-1 border border-outline-variant"
        >
          <button
            @click="archiveFilter = 'all'"
            class="px-3.5 py-1.5 rounded-full text-label-md font-bold transition-all cursor-pointer"
            :class="
              archiveFilter === 'all'
                ? 'bg-white text-primary shadow-sm'
                : 'text-on-white-variant hover:text-on-white'
            "
          >
            الكل
          </button>
          <button
            @click="archiveFilter = 'active'"
            class="px-3.5 py-1.5 rounded-full text-label-md font-bold transition-all cursor-pointer"
            :class="
              archiveFilter === 'active'
                ? 'bg-white text-primary shadow-sm'
                : 'text-on-white-variant hover:text-on-white'
            "
          >
            النشط
          </button>
          <button
            @click="archiveFilter = 'archived'"
            class="px-3.5 py-1.5 rounded-full text-label-md font-bold transition-all cursor-pointer"
            :class="
              archiveFilter === 'archived'
                ? 'bg-white text-primary shadow-sm'
                : 'text-on-white-variant hover:text-on-white'
            "
          >
            المؤرشف
          </button>
          <button
            @click="negativeStockFilter = !negativeStockFilter"
            class="px-3.5 py-1.5 rounded-full text-label-md font-bold transition-all cursor-pointer flex items-center gap-1.5"
            :class="
              negativeStockFilter
                ? 'bg-red-100 text-red-700'
                : 'text-on-white-variant hover:bg-white hover:text-red-700'
            "
          >
            <AlertCircle class="w-3.5 h-3.5" />
            <span>سلبي</span>
          </button>
        </div>
        <div
          class="flex items-center gap-1 bg-white-low rounded-full p-1 border border-outline-variant"
        >
          <button
            v-for="field in [
              'qty_available',
              'standard_price',
              'list_price',
            ] as SortField[]"
            :key="field"
            @click="toggleSort(field)"
            class="px-3 py-1.5 rounded-full text-label-md font-bold transition-all cursor-pointer flex items-center gap-1.5"
            :class="
              sortField === field
                ? 'bg-white text-primary shadow-sm'
                : 'text-on-white-variant hover:text-on-white'
            "
          >
            <Package v-if="field === 'qty_available'" class="w-3.5 h-3.5" />
            <DollarSign v-if="field === 'standard_price'" class="w-3.5 h-3.5" />
            <Tag v-if="field === 'list_price'" class="w-3.5 h-3.5" />
            {{ sortLabels[field] }}
            <ArrowUp
              v-if="sortField === field && sortOrder === 'asc'"
              class="w-3 h-3"
            />
            <ArrowDown
              v-if="sortField === field && sortOrder === 'desc'"
              class="w-3 h-3"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Location + Category filters row -->
    <div
      class="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-outline-variant shadow-sm"
    >
      <div class="flex items-center gap-2">
        <MapPin class="w-4 h-4 text-on-white-variant shrink-0" />
        <select
          v-model="selectedLocationId"
          class="h-9 px-3 rounded-full border border-outline-variant bg-white text-label-md text-on-white outline-none focus:ring-2 focus:ring-primary cursor-pointer"
        >
          <option :value="null">جميع المواقع</option>
          <option v-for="loc in locations" :key="loc.id" :value="loc.id">
            {{ loc.name }}
          </option>
        </select>
      </div>
      <div class="w-px h-6 bg-outline-variant/50 self-center" />
      <div class="flex items-center gap-1.5 overflow-x-auto scrollbar-hidden">
        <Layers class="w-4 h-4 text-on-white-variant shrink-0" />
        <button
          @click="activeCategoryId = null"
          class="shrink-0 px-3 py-1 rounded-full text-label-sm transition-all cursor-pointer"
          :class="
            activeCategoryId === null
              ? 'bg-primary text-white font-bold shadow-sm'
              : 'text-on-white-variant hover:bg-white-low border border-outline-variant'
          "
        >
          الكل
        </button>
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="activeCategoryId = cat.id"
          class="shrink-0 px-3 py-1 rounded-full text-label-sm transition-all cursor-pointer"
          :class="
            activeCategoryId === cat.id
              ? 'bg-primary text-white font-bold shadow-sm'
              : 'text-on-white-variant hover:bg-white-low border border-outline-variant'
          "
        >
          {{ cat.name }}
        </button>
      </div>
    </div>

    <!-- Loading spinner -->
    <div
      v-if="pending && products.length === 0"
      class="h-[calc(100vh-200px)] flex items-center justify-center"
    >
      <div class="flex flex-col items-center gap-3 text-on-white-variant">
        <LoaderCircle class="w-8 h-8 animate-spin text-primary" />
        <span class="text-[13px]">جاري تحميل المنتجات...</span>
      </div>
    </div>

    <template v-else>
      <!-- Fetch error banner -->
      <div
        v-if="status === 'error'"
        class="bg-error/10 border border-error text-error p-6 rounded-2xl text-center"
      >
        <CloudOff class="w-10 h-10 mb-2 inline-block" />
        <p class="font-bold">فشل الاتصال بالخادم</p>
        <p class="text-sm opacity-80">{{ error?.message }}</p>
      </div>

      <ProductsTable
        :products="sortedProducts"
        :status="status"
        :all-products-count="totalItems"
        :current-page="currentPage"
        :total-pages="totalPages"
        :archive-filter="archiveFilter"
        :selected-location-id="selectedLocationId"
        @edit="handleEdit"
        @delete="handleDelete"
        @restore="handleRestore"
        @view-stock-movements="handleViewStockMovements"
        @next-page="nextPage"
        @prev-page="prevPage"
      />

      <ProductDrawer
        v-model:isOpen="drawerOpen"
        :mode="drawerMode"
        :product="selectedProduct"
        :is-saving="isSaving"
        @save="handleSave"
        @delete="handleDeleteFromDrawer"
      />
    </template>
  </div>

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

<style scoped>
.scrollbar-hidden {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hidden::-webkit-scrollbar {
  display: none;
}
</style>

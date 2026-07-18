<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { AlertCircle, Package } from "@lucide/vue";
import PosSearchBar from "./PosSearchBar.vue";
import PosCategoryFilter from "./PosCategoryFilter.vue";
import PosProductGrid from "./PosProductGrid.vue";
import PosCartPanel from "./PosCartPanel.vue";
import PosProductDetailSheet from "./PosProductDetailSheet.vue";
import { usePosCartStore } from "~~/stores/pos-cart";
import type { POSProduct, POSCategory } from "~/types/pos";

const props = defineProps<{
  configId: string;
}>();

const cart = usePosCartStore();

const searchQuery = ref("");
const scannerActive = ref(false);
const activeCategoryId = ref<number | null>(null);
const currentPage = ref(1);
const selectedProduct = ref<POSProduct | null>(null);
const showProductDetail = ref(false);

const allProducts = ref<POSProduct[]>([]);
const categories = ref<POSCategory[]>([]);
const warehouses = ref<any[]>([]);
const loading = ref(false);
const error = ref("");
const totalPages = ref(1);

const filteredProducts = computed(() => {
  if (!activeCategoryId.value) return allProducts.value;
  return allProducts.value.filter((p) =>
    p.pos_categ_ids?.includes(activeCategoryId.value!),
  );
});

const hasMore = computed(() => currentPage.value < totalPages.value);

async function loadMasterData(page = 1) {
  loading.value = true;
  error.value = "";
  try {
    const query: Record<string, any> = {
      config_id: props.configId,
      page,
      limit: 28,
    };
    if (activeCategoryId.value) query.category_id = activeCategoryId.value;
    if (searchQuery.value) query.search = searchQuery.value;

    const res = await $fetch<any>("/api/pos/master-data", { query });

    if (res.success) {
      if (page === 1) {
        allProducts.value = res.products.data;
      } else {
        allProducts.value.push(...res.products.data);
      }
      totalPages.value = res.products.totalPages;
      currentPage.value = page;

      if (page === 1 && res.categories) {
        categories.value = res.categories;
      }
      if (res.warehouses) warehouses.value = res.warehouses;
    }
  } catch (err: any) {
    error.value = err.message || err.statusMessage || "فشل تحميل البيانات";
  } finally {
    loading.value = false;
  }
}

function handleLoadMore() {
  if (hasMore.value && !loading.value) {
    loadMasterData(currentPage.value + 1);
  }
}

function handleCategorySelect(categoryId: number | null) {
  activeCategoryId.value = categoryId;
  currentPage.value = 1;
  allProducts.value = [];
  loadMasterData(1);
}

function handleSearch(val: string) {
  searchQuery.value = val;
  currentPage.value = 1;
  allProducts.value = [];
  loadMasterData(1);
}

function handleScan(barcode: string) {
  searchQuery.value = barcode;
  scannerActive.value = false;
  currentPage.value = 1;
  allProducts.value = [];
  loadMasterData(1);
}

function handleProductClick(product: POSProduct) {
  selectedProduct.value = product;
  showProductDetail.value = true;
}

function handleAddToCart(product: POSProduct) {
  const qty = product.to_weight ? 0.01 : 1;
  cart.addItem(product, undefined, qty);
}

function handleAddToCartFromDetail(product: POSProduct) {
  handleAddToCart(product);
  showProductDetail.value = false;
}

watch(
  () => props.configId,
  (id) => {
    if (id) {
      currentPage.value = 1;
      allProducts.value = [];
      loadMasterData(1);
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="h-full flex gap-0 overflow-hidden">
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div
        class="px-4 py-3 border-b border-outline-variant/20 bg-card/50 sticky top-0 z-10"
      >
        <PosSearchBar
          v-model="searchQuery"
          v-model:scanner-active="scannerActive"
          @scan="handleScan"
          @update:model-value="handleSearch"
        />
      </div>

      <div class="flex-1 flex overflow-hidden">
        <aside
          class="hidden md:block w-52 shrink-0 border-l border-outline-variant/20 overflow-y-auto custom-scrollbar p-3"
        >
          <div class="flex items-center gap-2 mb-3 px-1">
            <Package class="w-4 h-4 text-primary" />
            <h3
              class="text-xs font-bold text-muted-foreground uppercase tracking-wider"
            >
              الأقسام
            </h3>
          </div>
          <PosCategoryFilter
            :categories="categories"
            :active-category-id="activeCategoryId"
            @select="handleCategorySelect"
          />
        </aside>

        <main class="flex-1 overflow-y-auto p-3">
          <div
            v-if="error"
            class="flex items-start gap-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 mb-4"
          >
            <AlertCircle class="h-5 w-5 shrink-0" />
            <p class="flex-1">{{ error }}</p>
          </div>

          <PosProductGrid
            :products="filteredProducts"
            :loading="loading"
            :has-more="hasMore"
            @load-more="handleLoadMore"
            @product-click="handleProductClick"
            @add-to-cart="handleAddToCart"
          />
        </main>
      </div>
    </div>

    <aside class="hidden lg:flex lg:w-2/3 shrink-0 flex-col">
      <PosCartPanel />
    </aside>

    <div
      class="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-outline-variant/20 z-40 px-4 py-2 flex items-center justify-between"
    >
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-primary"
          >shopping_cart</span
        >
        <span class="font-bold text-sm">{{ cart.itemCount }}</span>
        <span class="text-muted-foreground text-xs">منتجات</span>
      </div>
      <div class="flex items-center gap-3">
        <span class="font-bold text-primary">
          {{
            cart.grandTotal.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })
          }}
          ج.م
        </span>
        <button
          class="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-bold cursor-pointer"
        >
          إتمام
        </button>
      </div>
    </div>

    <PosProductDetailSheet
      :product="selectedProduct"
      :open="showProductDetail"
      @update:open="showProductDetail = $event"
      @add-to-cart="handleAddToCartFromDetail"
    />
  </div>
</template>

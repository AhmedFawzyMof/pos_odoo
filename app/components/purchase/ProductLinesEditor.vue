<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { Package, Trash2, LoaderCircle, Plus } from "@lucide/vue";
import type { ProductResult, POLineInput } from "~/types/purchase";
import ProductDrawer from "~/components/products/ProductDrawer.vue";
import type { Product } from "~/types/product";

const lines = defineModel<POLineInput[]>("lines", { required: true });

const search = ref("");
const searchInputRef = ref<HTMLInputElement | null>(null);
const results = ref<ProductResult[]>([]);
const isSearching = ref(false);
const showDropdown = ref(false);

const drawerOpen = ref(false);
const drawerMode = ref<"add" | "edit">("add");
const isSaving = ref(false);
const selectedProductForDrawer = ref<Product | null>(null);

watch(drawerOpen, (open) => {
  if (!open) focusSearch();
});

let debounce: NodeJS.Timeout;

const focusSearch = () => {
  nextTick(() => {
    searchInputRef.value?.focus();
  });
};

watch(search, (q) => {
  const clean = q.trim();
  if (!clean) {
    results.value = [];
    showDropdown.value = false;
    return;
  }
  clearTimeout(debounce);
  debounce = setTimeout(async () => {
    isSearching.value = true;
    try {
      const res = await $fetch<{ success: boolean; data: ProductResult[] }>(
        "/api/products/search",
        { params: { query: clean } },
      );
      results.value = res.data || [];
      showDropdown.value = true;
    } catch {
      results.value = [];
    } finally {
      isSearching.value = false;
    }
  }, 400);
});

const openCreateForm = () => {
  drawerMode.value = "add";
  selectedProductForDrawer.value = null;
  drawerOpen.value = true;
  showDropdown.value = false;
};

const handleDrawerSave = (payload: any) => {
  const productId = payload.id || payload.product_id;
  lines.value.push({
    product_id: productId,
    product_name: payload.name,
    quantity: 1,
    price_unit: payload.standard_price || 0,
    list_price: payload.list_price || 0,
    location_allocations: [],
    tax_ids: payload.taxes_id || [],
  });
  search.value = "";
  results.value = [];
  showDropdown.value = false;
  drawerOpen.value = false;
  focusSearch();
};

const addLine = (p: ProductResult) => {
  lines.value.push({
    product_id: p.id,
    product_name: p.name,
    quantity: 1,
    price_unit: p.standard_price || 0,
    list_price: p.list_price || 0,
    location_allocations: [],
    tax_ids: p.taxes_id || [],
  });
  search.value = "";
  results.value = [];
  showDropdown.value = false;
  focusSearch();
};

const removeLine = (idx: number) => {
  lines.value.splice(idx, 1);
};

const lineTotal = (line: POLineInput) => line.quantity * line.price_unit;

const grandTotal = computed(() =>
  lines.value.reduce((s, l) => s + lineTotal(l), 0),
);
</script>

<template>
  <div class="space-y-1.5">
    <label class="text-label-md font-bold text-on-white-variant"
      >المنتجات *</label
    >

    <div class="relative">
      <input
        ref="searchInputRef"
        v-model="search"
        class="w-full h-11 px-4 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
        placeholder="ابحث عن منتج وأضفه..."
        type="text"
      />
      <div v-if="isSearching" class="absolute left-3 top-1/2 -translate-y-1/2">
        <LoaderCircle class="w-4 h-4 animate-spin text-on-white-variant" />
      </div>
      <div
        v-if="showDropdown && results.length > 0"
        class="absolute z-10 mt-1 w-full bg-white border border-outline-variant rounded-xl shadow-lg max-h-48 overflow-y-auto"
      >
        <button
          v-for="p in results"
          :key="p.id"
          @click="addLine(p)"
          class="w-full text-right px-4 py-3 hover:bg-primary/5 cursor-pointer border-b border-outline-variant/30 last:border-0 flex items-center gap-3"
        >
          <Package class="w-4 h-4 text-on-white-variant shrink-0" />
          <div>
            <div class="font-bold text-body-md">{{ p.name }}</div>
            <div class="text-label-md text-on-white-variant">
              {{ p.barcode || "—" }}
              <span v-if="p.standard_price" class="text-error/70 ms-2">
                شراء: {{ p.standard_price.toLocaleString("en-US") }} ج.م
              </span>
              <span v-if="p.list_price" class="text-emerald-600 ms-2">
                بيع: {{ p.list_price.toLocaleString("en-US") }} ج.م
              </span>
            </div>
          </div>
        </button>
        <button
          @click="openCreateForm"
          class="w-full text-right px-4 py-3 hover:bg-primary/5 cursor-pointer border-t border-outline-variant/30 flex items-center gap-3 text-primary font-bold"
        >
          <Plus class="w-4 h-4" />
          <span>إنشاء منتج جديد "{{ search.trim() }}"</span>
        </button>
      </div>
      <div
        v-if="
          showDropdown && results.length === 0 && search.trim() && !isSearching
        "
        class="absolute z-10 mt-1 w-full bg-white border border-outline-variant rounded-xl shadow-lg p-4"
      >
        <p class="text-label-md text-on-white-variant mb-3">
          لا توجد نتائج لـ "{{ search.trim() }}"
        </p>
        <button
          @click="openCreateForm"
          class="w-full px-4 py-3 bg-primary/10 text-primary rounded-xl font-bold hover:bg-primary/20 cursor-pointer flex items-center gap-2 justify-center"
        >
          <Plus class="w-4 h-4" />
          إنشاء منتج جديد
        </button>
      </div>
    </div>

    <div
      v-if="lines.length > 0"
      class="border border-outline-variant rounded-xl overflow-hidden mt-3"
    >
      <table class="w-full text-right border-collapse">
        <thead class="bg-white-low text-on-white-variant">
          <tr>
            <th class="p-3 text-label-md font-bold">المنتج</th>
            <th class="p-3 text-label-md font-bold">الكمية</th>
            <th class="p-3 text-label-md font-bold">سعر الشراء</th>
            <th class="p-3 text-label-md font-bold">سعر البيع</th>
            <th class="p-3 text-label-md font-bold">الإجمالي</th>
            <th class="p-3 w-10"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant/45">
          <template v-for="(line, idx) in lines" :key="idx">
            <tr class="hover:bg-primary/5">
              <td class="p-3 font-bold text-body-md">
                {{ line.product_name }}
              </td>
              <td class="p-3">
                <input
                  v-model.number="line.quantity"
                  type="number"
                  min="0"
                  step="1"
                  class="w-20 h-9 px-2 border border-outline-variant rounded-lg text-center text-body-md outline-none focus:ring-2 focus:ring-primary"
                />
              </td>
              <td class="p-3">
                <input
                  v-model.number="line.price_unit"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-24 h-9 px-2 border border-outline-variant rounded-lg text-center text-body-md outline-none focus:ring-2 focus:ring-primary"
                />
              </td>
              <td class="p-3">
                <input
                  v-model.number="line.list_price"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-24 h-9 px-2 border border-outline-variant rounded-lg text-center text-body-md outline-none focus:ring-2 focus:ring-primary"
                />
              </td>
              <td class="p-3 font-bold">
                {{ lineTotal(line).toLocaleString("en-US") }} ج.م
              </td>
              <td class="p-3">
                <button
                  @click="removeLine(idx)"
                  class="w-8 h-8 rounded-lg hover:bg-error/10 flex items-center justify-center text-error cursor-pointer"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </template>
        </tbody>
        <tfoot class="bg-white-low">
          <tr>
            <td colspan="4" class="p-3 text-label-md text-on-white-variant">
              {{ lines.length }} صنف
            </td>
            <td class="p-3 text-label-md font-bold text-on-white-variant">
              الإجمالي
            </td>
            <td class="p-3 font-bold text-primary">
              {{ grandTotal.toLocaleString("en-US") }} ج.م
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
    <p v-else class="text-label-md text-on-white-variant py-2">
      لم يتم إضافة أي منتجات بعد
    </p>

    <ProductDrawer
      :is-open="drawerOpen"
      :mode="drawerMode"
      :product="selectedProductForDrawer"
      :is-saving="isSaving"
      default-type="consu"
      @update:is-open="drawerOpen = $event"
      @save="handleDrawerSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from "vue";
import {
  ClipboardCheck,
  X,
  AlertTriangle,
  RefreshCw,
  VideoOff,
  ScanBarcode,
  Trash2,
  AlertCircle,
  Check,
} from "@lucide/vue";
import { tryWeightBarcodeSearch } from "~/utils/weightBarcode";
import { usePermissions } from "~/composables/usePermissions";
import { useBarcodeScanner } from "~/composables/useBarcodeScanner";
const { can } = usePermissions();

interface OdooLocation {
  id: number;
  name: string;
  type: string;
}

interface Product {
  id: number | string;
  name: string;
  barcode: string;
  quantity?: number;
}

interface ReconciliationItem {
  product: Product;
  countedQuantity: number;
  systemQuantity: number;
  variance: number;
}

const props = defineProps<{
  open: boolean;
  existingLocations: OdooLocation[];
}>();

const emit = defineEmits<{
  (e: "update:open", val: boolean): void;
  (e: "reconciliation-completed", payload: any): void;
}>();

const location = ref<OdooLocation | null>(null);

const reconcilableLocations = computed(() =>
  props.existingLocations.filter((loc) => ["internal", "scrap"].includes(loc.type))
);

const reconciliationCart = ref<ReconciliationItem[]>([]);

const searchQuery = ref("");
const searchResults = ref<Product[]>([]);
const isSearching = ref(false);
const showDropdown = ref(false);
const isProductNotFound = ref(false);

const {
  isActive: isScannerActive,
  isPaused: isScanningPaused,
  start,
  stop,
} = useBarcodeScanner({
  elementId: "camera-preview-reconciliation",
  pauseDuration: 1800,
  onScan: (barcode, done) => {
    searchQuery.value = barcode.trim();
    setTimeout(done, 1800);
  },
});

let debounceTimeout: NodeJS.Timeout;

watch(searchQuery, (newQuery) => {
  const cleanQuery = newQuery.trim();
  if (!cleanQuery || !location.value) {
    searchResults.value = [];
    showDropdown.value = false;
    return;
  }

  isSearching.value = true;
  showDropdown.value = true;
  isProductNotFound.value = false;

  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(async () => {
    try {
      const { searchQuery: actualQuery } = tryWeightBarcodeSearch(cleanQuery);
      const res = await $fetch<{ success: boolean; data: Product[] }>(
        "/api/products/search",
        {
          params: {
            query: actualQuery,
            locationId: location.value?.id,
            includeZeroQty: "true",
          },
        }
      );
      searchResults.value = res.data;
    } catch (err) {
      console.error(err);
    } finally {
      isSearching.value = false;
    }
  }, 400);
});

const toggleCameraScanner = async () => {
  if (isScannerActive.value) {
    await stop();
  } else {
    await nextTick();
    start();
  }
};

const addProductToCart = (prod: Product) => {
  const existingLine = reconciliationCart.value.find(
    (item) => item.product.id === prod.id
  );

  if (existingLine) {
    existingLine.countedQuantity += 1;
    existingLine.variance = existingLine.countedQuantity - existingLine.systemQuantity;
  } else {
    reconciliationCart.value.push({
      product: { ...prod },
      countedQuantity: 1,
      systemQuantity: prod.quantity ?? 0,
      variance: 1 - (prod.quantity ?? 0),
    });
  }

  searchQuery.value = "";
  showDropdown.value = false;
  isProductNotFound.value = false;
};

const removeCartItem = (index: number) => {
  reconciliationCart.value.splice(index, 1);
};

const updateCountedQuantity = (index: number, newQty: number) => {
  if (newQty < 0) newQty = 0;
  reconciliationCart.value[index].countedQuantity = newQty;
  reconciliationCart.value[index].variance =
    newQty - reconciliationCart.value[index].systemQuantity;
};

const isSaving = ref(false);
const errorMessage = ref("");

const handleSubmitReconciliation = async () => {
  errorMessage.value = "";

  if (!location.value) {
    errorMessage.value = "يرجى تحديد موقع المخزون";
    return;
  }
  if (reconciliationCart.value.length === 0) {
    errorMessage.value = "يرجى إضافة منتج واحد على الأقل في قائمة التسوية";
    return;
  }

  isSaving.value = true;
  await stop();

  try {
    const response = await $fetch<{ success: boolean }>(
      "/api/warehouse/reconciliation",
      {
        method: "POST",
        body: {
          locationId: location.value.id,
          items: reconciliationCart.value.map((item) => ({
            productId:
              typeof item.product.id === "number" ? item.product.id : null,
            countedQuantity: item.countedQuantity,
          })),
        },
      }
    );

    if (response.success) {
      emit("reconciliation-completed", reconciliationCart.value);
      closeModal();
    }
  } catch (error: any) {
    errorMessage.value =
      error.statusMessage || "فشلت معالجة التسوية المخزنية";
  } finally {
    isSaving.value = false;
  }
};

const closeModal = async () => {
  await stop();
  reconciliationCart.value = [];
  searchQuery.value = "";
  location.value = null;
  errorMessage.value = "";
  emit("update:open", false);
};

const getVarianceClass = (variance: number) => {
  if (variance > 0) return "text-emerald-600 bg-emerald-50";
  if (variance < 0) return "text-red-600 bg-red-50";
  return "text-slate-600 bg-slate-50";
};

const getVarianceLabel = (variance: number) => {
  if (variance > 0) return `+${variance}`;
  if (variance < 0) return `${variance}`;
  return "متطابق";
};
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-50 bg-white flex flex-col font-sans text-slate-800"
      dir="rtl"
    >
      <div
        class="p-6 pb-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <ClipboardCheck
            class="text-primary bg-primary/10 p-2 rounded-lg w-10 h-10"
          />
          <div>
            <h3 class="text-lg font-bold text-slate-900">
              تسوية المخزون
            </h3>
            <p class="text-xs text-slate-500">
              جرد فعلي للمنتجات في موقع محدد وتحديث الكميات
            </p>
          </div>
        </div>
        <button
          @click="closeModal"
          class="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <div
        class="p-6 space-y-5 overflow-y-auto text-right max-w-7xl mx-auto w-full"
      >
        <div
          v-if="errorMessage"
          class="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold flex items-center gap-2"
        >
          <AlertTriangle class="w-4 h-4" />
          {{ errorMessage }}
        </div>

        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-600"
            >موقع المخزون (المصدر)</label
          >
          <select
            v-model="location"
            class="w-full h-11 bg-white border border-slate-200 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option :value="null" disabled>اختر موقع المخزون</option>
            <option
              v-for="loc in reconcilableLocations"
              :key="loc.id"
              :value="loc"
            >
              {{ loc.name }}
            </option>
          </select>
        </div>

        <div class="space-y-1.5 relative">
          <label class="block text-xs font-bold text-slate-600"
            >إضافة مواد عبر البحث والمسح الشريطي</label
          >

          <div
            v-show="isScannerActive"
            class="mb-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-950 relative shadow-inner"
          >
            <div id="camera-preview-reconciliation" class="w-full mx-auto max-w-[450px]"></div>
            <div
              v-if="isScanningPaused"
              class="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-xs"
            >
              <span
                class="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full font-bold animate-pulse"
                >تم التقاط الكود بنجاح...</span
              >
            </div>
          </div>

          <div class="relative flex items-center">
            <input
              v-model="searchQuery"
              type="text"
              :disabled="!location"
              :placeholder="
                location
                  ? 'امسح الباركود أو ابحث باسم المادة لإضافتها للجرد...'
                  : 'يرجى اختيار موقع المخزون أولاً'
              "
              class="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg pr-4 pl-12 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />

            <RefreshCw
              v-if="isSearching"
              class="absolute left-12 text-slate-400 animate-spin w-5 h-5"
            />

            <button
              type="button"
              @click="toggleCameraScanner"
              :disabled="!location"
              :class="[
                'absolute left-1.5 h-8 w-9 flex items-center justify-center rounded-md transition-all border outline-hidden',
                !location
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : isScannerActive
                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
              ]"
              title="تشغيل كاميرا مسح الباركود"
            >
              <VideoOff v-if="isScannerActive" class="w-5 h-5" />
              <ScanBarcode v-else class="w-5 h-5" />
            </button>
          </div>

          <div
            v-if="showDropdown && searchResults.length > 0"
            class="absolute bg-white left-0 right-0 mt-1 z-50 border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-y-auto divide-y divide-slate-100"
          >
            <button
              v-for="prod in searchResults"
              :key="prod.id"
              type="button"
              @click="addProductToCart(prod)"
              class="w-full px-4 py-2.5 text-right text-xs hover:bg-slate-50 flex justify-between items-center"
            >
              <span class="font-bold text-slate-800">{{ prod.name }}</span>
              <span class="flex items-center gap-2">
                <span
                  v-if="prod.quantity !== undefined"
                  class="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded"
                >
                  متوفر: {{ prod.quantity }}
                </span>
                <span
                  class="text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded"
                >
                  كود: {{ prod.barcode || "N/A" }}
                </span>
              </span>
            </button>
          </div>
        </div>

        <div class="border border-slate-200 rounded-xl overflow-hidden">
          <div
            class="bg-slate-50 p-3 border-b border-slate-200 text-xs font-bold text-slate-600 grid grid-cols-12 gap-2"
          >
            <div class="col-span-5 text-right">المنتج</div>
            <div class="col-span-2 text-center">كمية النظام</div>
            <div class="col-span-2 text-center">الكمية المحسوبة</div>
            <div class="col-span-2 text-center">الانحراف</div>
            <div class="col-span-1 text-center">إجراء</div>
          </div>

          <div
            v-if="reconciliationCart.length === 0"
            class="p-8 text-center text-slate-400 text-xs"
          >
            القائمة فارغة. يرجى مسح أو إضافة منتجات لبدء عملية التسوية.
          </div>

          <div
            v-else
            class="divide-y divide-slate-100 max-h-48 overflow-y-auto"
          >
            <div
              v-for="(item, index) in reconciliationCart"
              :key="item.product.id"
              class="p-3 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-50/60"
            >
              <div
                class="col-span-5 text-right font-medium text-slate-900 truncate"
              >
                {{ item.product.name }}
              </div>
              <div class="col-span-2 text-center font-mono text-slate-700">
                {{ item.systemQuantity }}
              </div>
              <div class="col-span-2 flex flex-col items-center gap-0.5">
                <input
                  v-model.number="item.countedQuantity"
                  @input="updateCountedQuantity(index, item.countedQuantity)"
                  type="number"
                  min="0"
                  class="w-16 h-8 text-center font-mono border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white text-xs"
                />
              </div>
              <div class="col-span-2 text-center">
                <span
                  :class="[
                    'px-2 py-0.5 rounded font-bold text-[10px]',
                    getVarianceClass(item.variance),
                  ]"
                >
                  {{ getVarianceLabel(item.variance) }}
                </span>
              </div>
              <div class="col-span-1 flex justify-center">
                <button
                  @click="removeCartItem(index)"
                  class="text-red-500 hover:text-red-700 p-1 flex items-center justify-center"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        class="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3"
      >
        <button
          type="button"
          @click="closeModal"
          class="h-11 px-5 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs"
        >
          إلغاء
        </button>
        <button
          v-if="can('warehouse.reconciliation')"
          type="button"
          @click="handleSubmitReconciliation"
          :disabled="isSaving || reconciliationCart.length === 0"
          class="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-2 disabled:opacity-40"
        >
          <RefreshCw v-if="isSaving" class="w-4 h-4 animate-spin" />
          <span>{{
            isSaving ? "جاري ترحيل التسوية..." : "ترحيل التسوية والمزامنة"
          }}</span>
        </button>
      </div>
    </div>
  </Transition>
</template>
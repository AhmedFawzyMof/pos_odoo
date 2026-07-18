<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import {
  GitMerge,
  X,
  AlertTriangle,
  RefreshCw,
  VideoOff,
  ScanBarcode,
  Trash2,
} from "@lucide/vue";
import { tryWeightBarcodeSearch } from "~/utils/weightBarcode";
import { usePermissions } from "~/composables/usePermissions";
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

interface TransferItem {
  product: Product;
  quantity: number;
  createNewProduct: boolean;
}

const props = defineProps<{
  open: boolean;
  existingLocations: OdooLocation[];
}>();

const emit = defineEmits<{
  (e: "update:open", val: boolean): void;
  (e: "transfer-completed", payload: any): void;
}>();

const sourceLocation = ref<OdooLocation | null>(null);
const destinationLocation = ref<OdooLocation | null>(null);

const transferableLocations = computed(() =>
  props.existingLocations.filter((loc) =>
    ["internal", "scrap"].includes(loc.type)
  )
);

const transferCart = ref<TransferItem[]>([]);

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
  elementId: "camera-preview",
  pauseDuration: 1800,
  onScan: (barcode, done) => {
    searchQuery.value = barcode.trim();
    setTimeout(done, 1800);
  },
});

let debounceTimeout: NodeJS.Timeout;

watch(searchQuery, (newQuery) => {
  const cleanQuery = newQuery.trim();
  if (!cleanQuery || !sourceLocation.value) {
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
            locationId: sourceLocation.value?.id,
          },
        },
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

const addProductToCart = (prod: Product, autoCreate = false) => {
  const existingLine = transferCart.value.find(
    (item) => item.product.id === prod.id && !autoCreate,
  );

  const maxQty = (
    prod.quantity !== undefined ? prod.quantity : Infinity
  ) as number;

  if (existingLine) {
    existingLine.quantity = Math.min(existingLine.quantity + 1, maxQty);
  } else {
    transferCart.value.push({
      product: { ...prod },
      quantity: 1,
      createNewProduct: autoCreate,
    });
  }

  searchQuery.value = "";
  showDropdown.value = false;
  isProductNotFound.value = false;
};

const handleAddNewProductFallback = () => {
  if (!searchQuery.value.trim()) return;

  const customFakeProduct: Product = {
    id: `NEW-${Date.now()}`,
    name: searchQuery.value.trim(),
    barcode: searchQuery.value.trim().match(/^[0-9]+$/)
      ? searchQuery.value.trim()
      : "",
  };

  addProductToCart(customFakeProduct, true);
};

const removeCartItem = (index: number) => {
  transferCart.value.splice(index, 1);
};

const isSaving = ref(false);
const errorMessage = ref("");

const handleSubmitBatchTransfer = async () => {
  errorMessage.value = "";

  if (!sourceLocation.value || !destinationLocation.value) {
    errorMessage.value = "يرجى تحديد موقع المصدر وموقع الوجهة";
    return;
  }
  if (sourceLocation.value.id === destinationLocation.value.id) {
    errorMessage.value = "لا يمكن النقل إلى نفس الموقع";
    return;
  }
  if (transferCart.value.length === 0) {
    errorMessage.value = "يرجى إضافة منتج واحد على الأقل في قائمة النقل";
    return;
  }

  isSaving.value = true;
  await stop();

  try {
    const response = await $fetch<{ success: boolean }>(
      "/api/warehouse/transfer-batch",
      {
        method: "POST",
        body: {
          sourceLocationId: sourceLocation.value.id,
          destinationLocationId: destinationLocation.value.id,
          items: transferCart.value.map((item) => ({
            productId:
              typeof item.product.id === "number" ? item.product.id : null,
            productName: item.product.name,
            quantity: item.quantity,
            createNewProduct: item.createNewProduct,
          })),
        },
      },
    );

    if (response.success) {
      emit("transfer-completed", transferCart.value);
      closeModal();
    }
  } catch (error: any) {
    errorMessage.value =
      error.statusMessage || "فشلت معالجة شحنة التحويل المخزني";
  } finally {
    isSaving.value = false;
  }
};

const closeModal = async () => {
  await stop();
  transferCart.value = [];
  searchQuery.value = "";
  errorMessage.value = "";
  emit("update:open", false);
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
          <GitMerge
            class="text-primary bg-primary/10 p-2 rounded-lg w-10 h-10"
          />
          <div>
            <h3 class="text-lg font-bold text-slate-900">
              نقل مخزني متعدد المنتجات
            </h3>
            <p class="text-xs text-slate-500">
              تحويل مجموعة من المنتجات دفعة واحدة بين المواقع
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

        <div
          class="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100"
        >
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-600"
              >من موقع (المصدر)</label
            >
            <select
              v-model="sourceLocation"
              class="w-full h-11 bg-white border border-slate-200 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option :value="null" disabled>اختر مستودع المصدر</option>
              <option
                v-for="loc in transferableLocations"
                :key="loc.id"
                :value="loc"
              >
                {{ loc.name }}
              </option>
            </select>
          </div>
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-600"
              >إلى موقع (الوجهة)</label
            >
            <select
              v-model="destinationLocation"
              class="w-full h-11 bg-white border border-slate-200 rounded-lg px-3 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option :value="null" disabled>اختر مستودع الوجهة</option>
              <option
                v-for="loc in transferableLocations"
                :key="loc.id"
                :value="loc"
              >
                {{ loc.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="space-y-1.5 relative">
          <label class="block text-xs font-bold text-slate-600"
            >إضافة مواد عبر البحث والمسح الشريطي</label
          >

          <div
            v-show="isScannerActive"
            class="mb-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-950 relative shadow-inner"
          >
            <div id="camera-preview" class="w-full mx-auto max-w-[450px]"></div>
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
              :disabled="!sourceLocation"
              :placeholder="
                sourceLocation
                  ? 'امسح الباركود أو ابحث باسم المادة لإضافتها للشحنة...'
                  : 'يرجى اختيار موقع المصدر أولاً'
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
              :disabled="!sourceLocation"
              :class="[
                'absolute left-1.5 h-8 w-9 flex items-center justify-center rounded-md transition-all border outline-hidden',
                !sourceLocation
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
            <div class="col-span-6 text-right">المنتج</div>
            <div class="col-span-3 text-center">الكمية</div>
            <div class="col-span-2 text-center">الحالة</div>
            <div class="col-span-1 text-center">إجراء</div>
          </div>

          <div
            v-if="transferCart.length === 0"
            class="p-8 text-center text-slate-400 text-xs"
          >
            القائمة فارغة. يرجى مسح أو إضافة منتجات لبدء عملية النقل المخزني.
          </div>

          <div
            v-else
            class="divide-y divide-slate-100 max-h-48 overflow-y-auto"
          >
            <div
              v-for="(item, index) in transferCart"
              :key="item.product.id"
              class="p-3 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-50/60"
            >
              <div
                class="col-span-6 text-right font-medium text-slate-900 truncate"
              >
                {{ item.product.name }}
              </div>
              <div class="col-span-3 flex flex-col items-center gap-0.5">
                <input
                  v-model.number="item.quantity"
                  type="number"
                  min="1"
                  :max="item.product.quantity ?? 99999"
                  class="w-16 h-8 text-center font-mono border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white text-xs"
                />
                <span
                  v-if="
                    item.product.quantity !== undefined &&
                    item.quantity > item.product.quantity
                  "
                  class="text-[10px] text-red-600 font-bold"
                >
                  يتجاوز المتوفر ({{ item.product.quantity }})
                </span>
              </div>
              <div class="col-span-2 text-center">
                <span
                  v-if="item.createNewProduct"
                  class="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded font-bold"
                  >جديد</span
                >
                <span
                  v-else
                  class="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold"
                  >مسجل</span
                >
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
          v-if="can('warehouse.transfer')"
          type="button"
          @click="handleSubmitBatchTransfer"
          :disabled="isSaving || transferCart.length === 0"
          class="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-2 disabled:opacity-40"
        >
          <RefreshCw v-if="isSaving" class="w-4 h-4 animate-spin" />
          <span>{{
            isSaving ? "جاري ترحيل الباقة..." : "ترحيل الشحنة كاملة والمزامنة"
          }}</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

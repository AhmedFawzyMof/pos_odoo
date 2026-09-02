<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import {
  parseWeightBarcode,
  tryWeightBarcodeSearch,
} from "~/utils/weightBarcode";
import {
  AlertCircle,
  ShoppingCart,
  Plus,
  MapPin,
  Wallet,
  LogOut,
  Scale,
  LoaderCircle,
  Printer,
} from "@lucide/vue";
import PosSearchBar from "~/components/pos/PosSearchBar.vue";
import PosCategoryFilter from "~/components/pos/PosCategoryFilter.vue";
import PosProductGrid from "~/components/pos/PosProductGrid.vue";
import PosCartPanel from "~/components/pos/PosCartPanel.vue";
import PosProductDetailSheet from "~/components/pos/PosProductDetailSheet.vue";
import PosVaultModal from "~/components/pos/PosVaultModal.vue";
import PosPaymentSheet from "~/components/pos/PosPaymentSheet.vue";
import PosPaymentDiscount from "~/components/pos/PosPaymentDiscount.vue";
import PosPaymentCustomer from "~/components/pos/PosPaymentCustomer.vue";
import PosCloseSessionModal from "~/components/pos/PosCloseSessionModal.vue";
import PosHotkeyHelp from "~/components/pos/PosHotkeyHelp.vue";
import PosDeliveryDialog from "~/components/pos/PosDeliveryDialog.vue";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { usePosCartStore } from "~~/stores/pos-cart";
import { usePosHotkeys } from "~/composables/usePosHotkeys";
import { useReceiptPrint } from "~/composables/useReceiptPrint";
import { formatDateWithTime } from "~/lib/dateUtils";
import PosSessionMonitor from "~/components/pos/PosSessionMonitor.vue";
import type {
  POSProduct,
  POSProductVariant,
  POSCategory,
  PaymentMethod,
  OrderResponse,
} from "~/types/pos";
import { usePermissions } from "~/composables/usePermissions";

const { canViewPage, can, isManager } = usePermissions();

const route = useRoute();
const router = useRouter();

if (import.meta.client) {
  if (!canViewPage(route.path)) {
    navigateTo("/");
  }
}

const configId = computed(() => {
  const raw = route.query.config_id;
  return Array.isArray(raw) ? raw[0] : (raw ?? "");
});

const sessionId = ref<number | null>(null);

async function fetchSessionFromApi(configIdVal: string) {
  console.log("[POS] fetchSessionFromApi called with config_id:", configIdVal);
  try {
    const res = await $fetch<{ success: boolean; session: any }>(
      "/api/pos/status",
      {
        params: { config_id: configIdVal },
      },
    );
    if (res.success && res.session?.session_id) {
      console.log(
        "[POS] fetchSessionFromApi success, session_id:",
        res.session.session_id,
      );
      sessionId.value = res.session.session_id;
    } else {
      console.warn("[POS] fetchSessionFromApi no active session found");
    }
  } catch (err) {
    console.error("[POS] fetchSessionFromApi error:", err);
    sessionId.value = null;
  }
}

const cart = usePosCartStore();

const selectedLocationId = ref<number | null>(cart.selectedLocationId);

const searchQuery = ref("");
const scannerActive = ref(false);
const activeCategoryId = ref<number | null>(null);
const showWeightOnly = ref(false);
const currentPage = ref(1);
const selectedProduct = ref<POSProduct | null>(null);
const showProductDetail = ref(false);
const showProductsDrawer = ref(false);
const showVaultModal = ref(false);
const showCloseSessionModal = ref(false);
const showPaymentSheet = ref(false);
const showDiscountDialog = ref(false);
const showNotesDialog = ref(false);
const showCustomersDialog = ref(false);
const showDeliveryDialog = ref(false);
const showOrdersDialog = ref(false);
const isProcessingPayment = ref(false);

const sessionOrders = ref<any[]>([]);
const sessionOrdersLoading = ref(false);

async function fetchSessionOrders() {
  if (!sessionId.value) return;
  sessionOrdersLoading.value = true;
  try {
    const res = await $fetch<any>("/api/orders", {
      query: { session_id: sessionId.value, limit: 100 },
    });
    sessionOrders.value = res.data || [];
  } catch {
    sessionOrders.value = [];
  } finally {
    sessionOrdersLoading.value = false;
  }
}

watch(showOrdersDialog, (v) => {
  if (v) fetchSessionOrders();
});

async function printSessionOrder(order: any) {
  try {
    await fetchReceiptConfig();
    const data = await $fetch<any>("/api/orders/detail", {
      query: { id: order.id },
    });
    if (!data.success) return;
    const lines = data.lines || [];
    const payments = data.payments || [];
    const totalFromLines = lines.reduce(
      (sum: number, l: any) => sum + l.price_subtotal,
      0,
    );
    printReceipt({
      orderName: order.name,
      lastOrderItems: lines.map((l: any) => ({
        product: { name: l.product_id?.[1] || `#${l.product_id?.[0] || ""}` },
        quantity: l.qty,
        price: l.price_unit,
        discount: l.discount,
      })),
      lastOrderPayments: payments.map((p: any) => ({
        methodName:
          p.payment_method_id?.[1] || `#${p.payment_method_id?.[0] || ""}`,
        amount: p.amount,
      })),
      lastOrderSubtotal: totalFromLines,
      lastOrderDiscount: lines.reduce(
        (sum: number, l: any) =>
          sum + (l.price_unit * l.qty * l.discount) / 100,
        0,
      ),
      lastOrderServiceFee: order.service_fee || 0,
      lastOrderGrandTotal: order.amount_total,
      lastOrderCustomerName: data.order.partner_id?.[1] || "",
      lastOrderCustomerPhone: data.order.partner_phone || "",
      lastOrderCustomerAddress: data.order.partner_address || "",
    });
  } catch {
    // Silently fail
  }
}

const showToast = ref(false);
const toastMessage = ref("");
const toastType = ref<"success" | "error">("success");

function showFeedbackToast(
  message: string,
  type: "success" | "error" = "success",
) {
  toastMessage.value = message;
  toastType.value = type;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 3000);
}

const allProducts = ref<POSProduct[]>([]);
const categories = ref<POSCategory[]>([]);
const paymentMethods = ref<PaymentMethod[]>([]);
const locations = ref<any[]>([]);
const loading = ref(false);
const error = ref("");
const totalPages = ref(1);
const searchSuggestions = ref<POSProduct[]>([]);
const searchLoading = ref(false);
const allowOutOfStockSale = ref(false);

const { selectedCartIndex } = usePosHotkeys({
  paymentMethods,
  sessionId,
  showPaymentSheet,
  showCloseSessionModal,
  onCashPayment: handleCashPayment,
  onShowDiscount: handleShowDiscount,
  onToggleWeight: handleWeightToggle,
});

const { receiptConfig, fetchReceiptConfig, printReceipt } = useReceiptPrint();

const hasMore = computed(() => currentPage.value < totalPages.value);

async function loadMasterData(page = 1) {
  console.log(
    "[POS] loadMasterData page:",
    page,
    "config_id:",
    configId.value,
    "category:",
    activeCategoryId.value,
    "search:",
    searchQuery.value,
  );
  loading.value = true;
  error.value = "";
  try {
    const query: Record<string, any> = {
      config_id: configId.value,
      page,
      limit: 28,
    };
    if (activeCategoryId.value) query.category_id = activeCategoryId.value;
    if (searchQuery.value) query.search = searchQuery.value;
    if (selectedLocationId.value) query.location_id = selectedLocationId.value;
    if (showWeightOnly.value) query.to_weight = "true";

    const res = await $fetch<any>("/api/pos/master-data", { query });

    if (res.success) {
      console.log(
        "[POS] loadMasterData success, products:",
        res.products.data.length,
        "totalPages:",
        res.products.totalPages,
      );
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
      if (res.paymentMethods) {
        paymentMethods.value = res.paymentMethods;
      }
      if (res.locations) locations.value = res.locations;
      if (res.allowOutOfStockSale !== undefined) {
        allowOutOfStockSale.value = res.allowOutOfStockSale;
      }
    } else {
      console.warn("[POS] loadMasterData response not successful", res);
    }
  } catch (err: any) {
    console.error("[POS] loadMasterData error:", err);
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

function handleWeightToggle() {
  showWeightOnly.value = !showWeightOnly.value;
  currentPage.value = 1;
  allProducts.value = [];
  loadMasterData(1);
}

let searchDebounce: NodeJS.Timeout;
let searchRequestId = 0;

async function fetchSearchSuggestions(val: string) {
  const requestId = ++searchRequestId;
  if (!val.trim()) {
    searchSuggestions.value = [];
    return;
  }
  try {
    const query: Record<string, any> = {
      config_id: configId.value,
      page: 1,
      limit: 50,
      search: val,
    };
    if (selectedLocationId.value) query.location_id = selectedLocationId.value;
    if (activeCategoryId.value) query.category_id = activeCategoryId.value;

    const res = await $fetch<any>("/api/pos/master-data", { query });
    if (res.success && requestId === searchRequestId) {
      searchSuggestions.value = res.products.data || [];
    }
  } catch {
    if (requestId === searchRequestId) {
      searchSuggestions.value = [];
    }
  } finally {
    if (requestId === searchRequestId) {
      searchLoading.value = false;
    }
  }
}

async function lookupExactBarcode(barcode: string, quantity?: number) {
  scannerActive.value = false;
  clearTimeout(searchDebounce);
  searchSuggestions.value = [];
  searchLoading.value = false;

  try {
    const params: Record<string, any> = {
      config_id: configId.value,
      exact_barcode: barcode,
    };
    if (selectedLocationId.value) params.location_id = selectedLocationId.value;

    const res = await $fetch<any>("/api/pos/master-data", { params });
    if (res.success && res.products.data.length > 0) {
      const product = res.products.data[0];
      handleAddToCart(product, undefined, quantity);
      searchQuery.value = "";
      if (showWeightOnly.value) {
        showWeightOnly.value = false;
        currentPage.value = 1;
        allProducts.value = [];
        loadMasterData(1);
      }
      nextTick(() => {
        const input = document.querySelector<HTMLInputElement>('[placeholder*="بحث"]');
        input?.focus();
      });
    } else {
      showFeedbackToast("المنتج غير موجود", "error");
    }
  } catch {
    showFeedbackToast("خطأ في البحث عن المنتج", "error");
  }
}

function handleSearch(val: string) {
  clearTimeout(searchDebounce);
  if (!val.trim()) {
    searchSuggestions.value = [];
    searchLoading.value = false;
    return;
  }

  if (showWeightOnly.value) {
    const parsed = parseWeightBarcode(val);
    if (parsed) {
      searchSuggestions.value = [];
      searchLoading.value = false;
      lookupExactBarcode(parsed.productCode, parsed.weightKg);
      return;
    }
  }

  searchLoading.value = true;
  searchDebounce = setTimeout(() => {
    const searchVal = showWeightOnly.value ? tryWeightBarcodeSearch(val).searchQuery : val;
    fetchSearchSuggestions(searchVal);
  }, 300);
}

function handleSelectSuggestion(product: POSProduct) {
  searchSuggestions.value = [];
  handleAddToCart(product, undefined, 1);
}

async function handleScannerError(message: string) {
  showFeedbackToast(message, "error");
}

async function handleScan(barcode: string) {
  const parsed = showWeightOnly.value ? parseWeightBarcode(barcode) : null;
  const searchBarcode = parsed ? parsed.productCode : barcode;
  const weightKg = parsed ? parsed.weightKg : null;

  if (parsed) {
    console.log(`[WEIGHT-BARCODE] Parsed product barcode: ${searchBarcode}, quantity: ${weightKg}`);
  }

  await lookupExactBarcode(searchBarcode, weightKg ?? undefined);
}

function handleLocationChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  const val = target.value;
  const id = val ? Number(val) : null;
  const name = id
    ? locations.value.find((l: any) => l.id === id)?.name || ""
    : "";
  selectedLocationId.value = id;
  cart.setLocation(id, name);
  currentPage.value = 1;
  allProducts.value = [];
  loadMasterData(1);
}

function handleProductClick(product: POSProduct) {
  selectedProduct.value = product;
  showProductDetail.value = true;
}

function handleAddToCart(
  product: POSProduct,
  variant?: POSProductVariant,
  qty?: number,
) {
  const quantity = qty ?? 1;

  // Check stock availability for storable products
  if (product.type === "product") {
    let availableStock = 0;
    if (variant?.stock_by_location && variant.stock_by_location.length > 0) {
      availableStock = variant.stock_by_location.reduce((sum, s) => sum + s.quantity, 0);
    } else if (product.stock_by_location && product.stock_by_location.length > 0) {
      availableStock = product.stock_by_location.reduce((sum, s) => sum + s.quantity, 0);
    } else {
      availableStock = product.qty_available ?? 0;
    }
    if (availableStock <= 0) {
      showFeedbackToast("لا يوجد مخزون كافٍ لهذا المنتج", "error");
      return;
    }
    if (quantity > availableStock) {
      showFeedbackToast(`الكمية المتاحة ${availableStock} فقط`, "error");
      return;
    }
  }

  console.log("[POS] handleAddToCart", product, quantity);
  cart.addItem(product, variant, quantity);
}

function handleAddToCartFromDetail(
  product: POSProduct,
  variant?: POSProductVariant,
) {
  handleAddToCart(product, variant);
  showProductDetail.value = false;
}

function handleShowDiscount() {
  showDiscountDialog.value = true;
}

function handleShowPaymentMethods() {
  showPaymentSheet.value = true;
}

function handleShowNotes() {
  showNotesDialog.value = true;
}

function handleOpenClients() {
  showCustomersDialog.value = true;
}

function handleOpenOrders() {
  showOrdersDialog.value = true;
}

function handleOpenDelivery() {
  showDeliveryDialog.value = true;
}

function handleDeliverySave(payload: {
  driverId: number | null;
  driverName: string;
  deliveryCost: number;
}) {
  cart.setDelivery(payload.driverId, payload.driverName, payload.deliveryCost);
}

async function handleCashPayment() {
  if (cart.items.length === 0) return;
  if (!sessionId.value) {
    showFeedbackToast("يجب فتح وردية أولاً", "error");
    return;
  }
  if (!cart.selectedLocationId) {
    showFeedbackToast("يجب تحديد موقع التخزين", "error");
    return;
  }

  const cashMethod = paymentMethods.value.find((m) => m.is_cash_count);
  if (!cashMethod) {
    showFeedbackToast("طريقة الدفع نقدي غير متوفرة", "error");
    return;
  }

  isProcessingPayment.value = true;

  try {
    const res = await $fetch<OrderResponse>("/api/pos/order", {
      method: "POST",
      body: {
        session_id: sessionId.value,
        items: cart.items.map((item) => ({
          product_id: item.variant?.id || item.product.id,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount || 0,
          taxes_id: item.product.taxes?.map((t) => t.id) || [],
        })),
        payments: [
          {
            method_id: cashMethod.id,
            method_name: cashMethod.name,
            amount: cart.grandTotal,
          },
        ],
        note: cart.note,
        order_discount: cart.orderDiscount,
        order_discount_type: cart.orderDiscountType,
        service_fee: cart.serviceFee,
        service_fee_type: cart.serviceFeeType,
        customer_id: cart.customerId,
        location_id: cart.selectedLocationId,
        amount_tax: cart.totalTax,
        driver_id: cart.deliveryDriverId,
        delivery_cost: cart.deliveryCost,
      },
    });

    if (res.success) {
      const receiptItems = cart.items.map((item) => ({
        product: {
          name: item.variant
            ? `${item.product.display_name || item.product.name} (${item.variant.attribute_values?.map((v) => v.value_name).join("/") || item.variant.display_name})`
            : item.product.display_name || item.product.name,
        },
        quantity: item.quantity,
        price: item.price,
        discount: item.discount || 0,
      }));
      const receiptPayments = [
        { methodName: cashMethod.name, amount: cart.grandTotal },
      ];
      const receiptSubtotal = cart.subtotal;
      const receiptDiscount = cart.discountAmount;
      const receiptServiceFee = cart.serviceFeeAmount;
      const receiptGrandTotal = cart.grandTotal;
      const receiptCustomerName = cart.customerName;
      const receiptCustomerPhone = cart.customerPhone;
      const receiptCustomerAddress = cart.customerAddress;
      cart.clearCart();
      await fetchReceiptConfig();
      printReceipt({
        orderName: res.name,
        lastOrderItems: receiptItems,
        lastOrderPayments: receiptPayments,
        lastOrderSubtotal: receiptSubtotal,
        lastOrderDiscount: receiptDiscount,
        lastOrderServiceFee: receiptServiceFee,
        lastOrderGrandTotal: receiptGrandTotal,
        lastOrderCustomerName: receiptCustomerName,
        lastOrderCustomerPhone: receiptCustomerPhone,
        lastOrderCustomerAddress: receiptCustomerAddress,
      });
    }
  } catch (error: any) {
    showFeedbackToast(
      error.statusMessage || "فشل إنشاء الطلب",
      "error",
    );
  } finally {
    isProcessingPayment.value = false;
  }
}

function handleOrderCompleted() {
  showPaymentSheet.value = false;
}

function handleSessionClosed() {
  console.log(
    "[POS] handleSessionClosed - session closed, redirecting to config:",
    configId.value,
  );
  sessionId.value = null;
  showCloseSessionModal.value = false;
  cart.clearCart();
  router.push(configId.value ? `/pos?config_id=${configId.value}` : "/pos");
}

function handleSessionExpired() {
  if (!sessionId.value) return;
  sessionId.value = null;
  showVaultModal.value = false;
  showCloseSessionModal.value = false;
  cart.clearCart();
  showFeedbackToast("انتهت صلاحية الوردية، يرجى فتح وردية جديدة", "error");
}

watch(
  configId,
  async (id) => {
    if (id) {
      const raw = route.query.session_id;
      if (raw) {
        const parsed = Number(Array.isArray(raw) ? raw[0] : raw);
        sessionId.value = Number.isFinite(parsed) ? parsed : null;
      } else {
        await fetchSessionFromApi(id);
      }
      currentPage.value = 1;
      allProducts.value = [];
      await loadMasterData(1);

      if (!selectedLocationId.value && locations.value.length > 0) {
        const first = locations.value[0];
        selectedLocationId.value = first.id;
        cart.setLocation(first.id, first.name);
        currentPage.value = 1;
        allProducts.value = [];
        await loadMasterData(1);
      }
    }
  },
  { immediate: true },
);
</script>

<template>
  <div
    v-if="configId"
    class="flex gap-0 overflow-hidden -m-6 h-[calc(100vh-4rem)] relative"
  >
    <PosHotkeyHelp />
    <PosSessionMonitor
      :config-id="configId"
      :session-id="sessionId"
      @session-expired="handleSessionExpired"
    />
    <!-- Desktop left panel: search + categories + products (hidden on mobile) -->
    <div class="hidden lg:flex flex-1 flex-col min-w-0">
      <div
        class="px-4 py-3 border-b border-outline-variant/20 bg-card/50 sticky top-0 z-10"
      >
        <div class="flex items-center gap-2">
          <PosSearchBar
            v-model="searchQuery"
            v-model:scanner-active="scannerActive"
            :suggestions="searchSuggestions"
            :loading="searchLoading"
            class="flex-1"
            @scan="handleScan"
            @update:model-value="handleSearch"
            @add-to-cart="handleSelectSuggestion"
            @error="handleScannerError"
          />
        </div>
      </div>

      <div class="px-4 py-2 border-b border-outline-variant/20 bg-card/40">
        <div class="flex items-center gap-3">
          <div
            class="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0"
          >
            <MapPin class="w-3.5 h-3.5" />
            <select
              :value="selectedLocationId ?? ''"
              @change="handleLocationChange"
              class="bg-transparent border-none text-xs font-medium text-foreground cursor-pointer focus:outline-none"
            >
              <option value="">جميع المواقع</option>
              <option v-for="loc in locations" :key="loc.id" :value="loc.id">
                {{ loc.name }}
              </option>
            </select>
          </div>
          <button
            @click="handleWeightToggle"
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer shrink-0"
            :class="showWeightOnly
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-transparent border-outline-variant/40 text-muted-foreground hover:border-outline-variant/60'"
            title="عرض المنتجات الوزنية فقط"
          >
            <Scale class="w-3.5 h-3.5" />
            وزني فقط
          </button>
            <PosCategoryFilter
              :categories="categories"
              :active-category-id="activeCategoryId"
              :horizontal="true"
              @select="handleCategorySelect"
            />
            <div
              class="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0"
            >
              <Wallet class="w-3.5 h-3.5" />
              <button
                @click="showVaultModal = true"
                :disabled="!sessionId"
                class="bg-transparent border-none text-xs font-medium text-foreground cursor-pointer focus:outline-none hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                :title="!sessionId ? 'يجب فتح وردية أولاً' : 'حركات الخزنة'"
              >
                الخزنة
              </button>
          </div>
          <div
            v-if="can('cashier.forceClose')"
            class="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0"
          >
            <LogOut class="w-3.5 h-3.5" />
            <button
              @click="showCloseSessionModal = true"
              :disabled="!sessionId"
              class="bg-transparent border-none text-xs font-medium text-red-500 cursor-pointer focus:outline-none hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
              :title="!sessionId ? 'يجب فتح وردية أولاً' : 'إغلاق الوردية'"
            >
              إغلاق الوردية
            </button>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <div
          v-if="error"
          class="flex items-start gap-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 mb-4"
        >
          <AlertCircle class="h-5 w-5 shrink-0" />
          <p class="flex-1">{{ error }}</p>
        </div>

        <PosProductGrid
          :products="allProducts"
          :loading="loading"
          :has-more="hasMore"
          :selected-location-id="selectedLocationId"
          :allow-out-of-stock-sale="allowOutOfStockSale"
          @load-more="handleLoadMore"
          @product-click="handleProductClick"
          @add-to-cart="handleAddToCart"
        />
      </div>
    </div>

    <!-- Cart: always visible, full width on mobile, 2/3 on desktop -->
    <aside
      class="flex flex-col w-full lg:w-2/3 shrink-0 lg:border-l border-outline-variant/20"
    >
      <!-- Mobile: search + warehouse + categories at top of cart -->
      <div class="lg:hidden">
        <div class="px-4 py-3 border-b border-outline-variant/20 bg-card/50">
          <div class="flex items-center gap-2">
            <PosSearchBar
              v-model="searchQuery"
              v-model:scanner-active="scannerActive"
              :suggestions="searchSuggestions"
              :loading="searchLoading"
              class="flex-1"
              @scan="handleScan"
              @update:model-value="handleSearch"
              @add-to-cart="handleSelectSuggestion"
              @error="handleScannerError"
            />
          </div>
        </div>
        <div class="px-4 py-2 border-b border-outline-variant/20 bg-card/40">
          <div class="flex items-center gap-3">
            <div
              class="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0"
            >
              <MapPin class="w-3.5 h-3.5" />
              <select
                :value="selectedLocationId ?? ''"
                @change="handleLocationChange"
                class="bg-transparent border-none text-xs font-medium text-foreground cursor-pointer focus:outline-none"
              >
                <option value="">جميع المواقع</option>
                <option v-for="loc in locations" :key="loc.id" :value="loc.id">
                  {{ loc.name }}
                </option>
              </select>
            </div>
            <button
              @click="handleWeightToggle"
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer shrink-0"
              :class="showWeightOnly
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-transparent border-outline-variant/40 text-muted-foreground hover:border-outline-variant/60'"
              title="عرض المنتجات الوزنية فقط"
            >
              <Scale class="w-3.5 h-3.5" />
              وزني فقط
            </button>
            <PosCategoryFilter
              :categories="categories"
              :active-category-id="activeCategoryId"
              :horizontal="true"
              @select="handleCategorySelect"
            />
            <div
              class="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0"
            >
              <Wallet class="w-3.5 h-3.5" />
              <button
                @click="showVaultModal = true"
                :disabled="!sessionId"
                class="bg-transparent border-none text-xs font-medium text-foreground cursor-pointer focus:outline-none hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                :title="!sessionId ? 'يجب فتح وردية أولاً' : 'حركات الخزنة'"
              >
                الخزنة
              </button>
            </div>
            <div
              v-if="can('cashier.forceClose')"
              class="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0"
            >
              <LogOut class="w-3.5 h-3.5" />
              <button
                @click="showCloseSessionModal = true"
                :disabled="!sessionId"
                class="bg-transparent border-none text-xs font-medium text-red-500 cursor-pointer focus:outline-none hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                :title="!sessionId ? 'يجب فتح وردية أولاً' : 'إغلاق الوردية'"
              >
                إغلاق الوردية
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Cart panel fills remaining space -->
      <PosCartPanel
        :bordered="false"
        :selected-index="selectedCartIndex"
        :has-session="!!sessionId"
        :processing="isProcessingPayment"
        @pay-cash="handleCashPayment"
        @show-payment-methods="handleShowPaymentMethods"
        @show-notes="handleShowNotes"
        @show-discount="handleShowDiscount"
        @open-clients="handleOpenClients"
        @open-orders="handleOpenOrders"
        @show-delivery="handleOpenDelivery"
        @select-item="(i) => (selectedCartIndex = i)"
      />

      <!-- Mobile: add products button -->
      <div class="lg:hidden border-t border-outline-variant/20 bg-card">
        <div class="px-4 py-3">
          <Button
            class="w-full gap-2 cursor-pointer"
            size="lg"
            @click="showProductsDrawer = true"
          >
            <Plus class="w-5 h-5" />
            إضافة منتجات
          </Button>
        </div>
      </div>
    </aside>

    <!-- Mobile: products bottom sheet -->
    <Sheet v-model:open="showProductsDrawer">
      <SheetContent
        side="bottom"
        class="h-[85vh] p-0 flex flex-col rounded-t-2xl"
      >
        <div
          class="px-4 py-3 border-b border-outline-variant/20 bg-card/50 shrink-0"
        >
          <div class="flex items-center gap-2">
            <PosSearchBar
              v-model="searchQuery"
              v-model:scanner-active="scannerActive"
              :suggestions="searchSuggestions"
              :loading="searchLoading"
              class="flex-1"
              @scan="handleScan"
              @update:model-value="handleSearch"
              @add-to-cart="handleSelectSuggestion"
              @error="handleScannerError"
            />
          </div>
        </div>
        <div
          class="px-4 py-2 border-b border-outline-variant/20 bg-card/40 shrink-0"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0"
            >
              <MapPin class="w-3.5 h-3.5" />
              <select
                :value="selectedLocationId ?? ''"
                @change="handleLocationChange"
                class="bg-transparent border-none text-xs font-medium text-foreground cursor-pointer focus:outline-none"
              >
                <option value="">جميع المواقع</option>
                <option v-for="loc in locations" :key="loc.id" :value="loc.id">
                  {{ loc.name }}
                </option>
              </select>
            </div>
            <button
              @click="handleWeightToggle"
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer shrink-0"
              :class="showWeightOnly
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-transparent border-outline-variant/40 text-muted-foreground hover:border-outline-variant/60'"
              title="عرض المنتجات الوزنية فقط"
            >
              <Scale class="w-3.5 h-3.5" />
              وزني فقط
            </button>
            <PosCategoryFilter
              :categories="categories"
              :active-category-id="activeCategoryId"
              :horizontal="true"
              @select="handleCategorySelect"
            />
            <div
              class="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0"
            >
              <Wallet class="w-3.5 h-3.5" />
              <button
                @click="showVaultModal = true"
                :disabled="!sessionId"
                class="bg-transparent border-none text-xs font-medium text-foreground cursor-pointer focus:outline-none hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                :title="!sessionId ? 'يجب فتح وردية أولاً' : 'حركات الخزنة'"
              >
                الخزنة
              </button>
            </div>
            <div
              v-if="can('cashier.forceClose')"
              class="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0"
            >
              <LogOut class="w-3.5 h-3.5" />
              <button
                @click="showCloseSessionModal = true"
                :disabled="!sessionId"
                class="bg-transparent border-none text-xs font-medium text-red-500 cursor-pointer focus:outline-none hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                :title="!sessionId ? 'يجب فتح وردية أولاً' : 'إغلاق الوردية'"
              >
                إغلاق الوردية
              </button>
            </div>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-3 custom-scrollbar">
          <div
            v-if="error"
            class="flex items-start gap-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 mb-4"
          >
            <AlertCircle class="h-5 w-5 shrink-0" />
            <p class="flex-1">{{ error }}</p>
          </div>

          <PosProductGrid
            :products="allProducts"
            :loading="loading"
            :has-more="hasMore"
            :selected-location-id="selectedLocationId"
            :allow-out-of-stock-sale="allowOutOfStockSale"
            @load-more="handleLoadMore"
            @product-click="handleProductClick"
            @add-to-cart="handleAddToCart"
          />
        </div>
      </SheetContent>
    </Sheet>

    <PosProductDetailSheet
      :product="selectedProduct"
      :open="showProductDetail"
      @update:open="showProductDetail = $event"
      @add-to-cart="handleAddToCartFromDetail"
      @add-variant-to-cart="
        (variant) => handleAddToCartFromDetail(selectedProduct!, variant)
      "
    />

    <!-- Discount Dialog -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="showDiscountDialog"
          class="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div
            class="fixed inset-0 bg-black/50"
            @click="showDiscountDialog = false"
          />
          <div class="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 text-right">
            <PosPaymentDiscount />
            
            <Button class="w-full mt-4 cursor-pointer" @click="showDiscountDialog = false">
              تم
            </Button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Notes Dialog -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="showNotesDialog"
          class="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div
            class="fixed inset-0 bg-black/50"
            @click="showNotesDialog = false"
          />
          <div class="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 text-right">
            <h3 class="text-base font-bold text-on-white mb-3">ملاحظات على الفاتورة</h3>
            <textarea
              v-model="cart.note"
              rows="4"
              placeholder="أضف ملاحظات..."
              class="w-full bg-white border border-outline-variant rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
            />
            <Button class="w-full mt-4 cursor-pointer" @click="showNotesDialog = false">
              تم
            </Button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Customers Dialog -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="showCustomersDialog"
          class="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div
            class="fixed inset-0 bg-black/50"
            @click="showCustomersDialog = false"
          />
          <div class="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 text-right">
            <h3 class="text-base font-bold text-on-white mb-3">اختيار العميل</h3>
            <PosPaymentCustomer auto-expand />
            <Button class="w-full mt-4 cursor-pointer" @click="showCustomersDialog = false">
              تم
            </Button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Orders Dialog -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="showOrdersDialog"
          class="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div
            class="fixed inset-0 bg-black/50"
            @click="showOrdersDialog = false"
          />
          <div class="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 text-right max-h-[80vh] flex flex-col">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-base font-bold">طلبات الجلسة الحالية</h3>
              <Button variant="ghost" size="sm" @click="showOrdersDialog = false">✕</Button>
            </div>
            <div v-if="sessionOrdersLoading" class="flex items-center justify-center py-8">
              <LoaderCircle class="w-6 h-6 animate-spin text-primary" />
            </div>
            <div v-else-if="sessionOrders.length === 0" class="text-center py-8 text-muted-foreground">
              <p class="font-bold">لا توجد طلبات في هذه الجلسة</p>
            </div>
            <div v-else class="flex-1 overflow-y-auto space-y-2">
              <div
                v-for="order in sessionOrders"
                :key="order.id"
                class="border border-outline-variant/40 rounded-xl p-3 hover:bg-accent/50 transition-colors"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <span class="font-bold text-sm">{{ order.name }}</span>
                    <span
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      :class="{
                        'bg-primary/10 text-primary': order.state === 'paid' || order.state === 'done',
                        'bg-amber-100 text-amber-700': order.state === 'draft',
                        'bg-red-100 text-red-700': order.state === 'cancelled',
                      }"
                    >
                      {{ order.state === 'paid' ? 'مدفوع' : order.state === 'done' ? 'منتهي' : order.state === 'draft' ? 'مسودة' : 'ملغي' }}
                    </span>
                  </div>
                  <span class="font-bold text-primary text-sm">{{ order.amount_total.toLocaleString('en-US') }} ج.م</span>
                </div>
                <div class="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                  <span>{{ order.partner_id ? order.partner_id[1] : 'عميل نقدي' }}</span>
                  <div class="flex items-center gap-2">
                    <span>{{ formatDateWithTime(order.date_order) }}</span>
                    <Button
                      v-if="order.state !== 'cancelled'"
                      variant="ghost"
                      size="sm"
                      class="h-7 px-2 gap-1 cursor-pointer"
                      @click="printSessionOrder(order)"
                    >
                      <Printer class="w-3.5 h-3.5" />
                      طباعة
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <PosVaultModal
      v-if="sessionId"
      v-model:open="showVaultModal"
      :session-id="sessionId"
    />

    <PosCloseSessionModal
      v-if="sessionId"
      v-model:open="showCloseSessionModal"
      :session-id="sessionId"
      :config-id="configId"
      @session-closed="handleSessionClosed"
    />

    <PosPaymentSheet
      v-if="sessionId"
      v-model:open="showPaymentSheet"
      :payment-methods="paymentMethods"
      :session-id="sessionId"
      :config-id="configId"
      @order-completed="handleOrderCompleted"
    />

    <PosDeliveryDialog
      :is-open="showDeliveryDialog"
      :driver-id="cart.deliveryDriverId"
      :driver-name="cart.deliveryDriverName"
      :delivery-cost="cart.deliveryCost"
      @update:is-open="(v) => (showDeliveryDialog = v)"
      @save="handleDeliverySave"
    />
  </div>
  <div v-else class="flex items-center justify-center h-[calc(100vh-8rem)]">
    <div class="text-center space-y-3">
      <ShoppingCart class="h-12 w-12 mx-auto text-muted-foreground/40" />
      <p class="text-muted-foreground">لم يتم تحديد جهاز كاشير</p>
    </div>
  </div>

  <!-- Feedback Toast -->
  <div
    class="fixed bottom-10 left-1/2 -translate-x-1/2 z-100 transition-all duration-500"
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
          ? 'bg-primary text-white'
          : 'bg-red-600 text-white'
      "
    >
      <AlertCircle class="w-5 h-5 shrink-0" />
      <div>
        <p class="font-bold text-sm">{{ toastMessage }}</p>
      </div>
    </div>
  </div>
</template>

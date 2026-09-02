<script setup lang="ts">
import { ref, watch, computed } from "vue";
import {
  X,
  LoaderCircle,
  Trash2,
  AlertCircle,
  CheckCheck,
  Save,
  Plus,
  Wallet,
  Minus,
  Percent,
  MessageSquareText,
  Search,
  User,
} from "@lucide/vue";
import type {
  POSOrder,
  OrderLine,
  OrderPayment,
  PaymentMethod,
} from "~/types/pos";
import { usePermissions } from "~/composables/usePermissions";
import { useReceiptPrint } from "~/composables/useReceiptPrint";
const { can } = usePermissions();
const { fetchReceiptConfig } = useReceiptPrint();

interface EditableLine {
  _key: number;
  id: number | null;
  product_id: [number, string];
  qty: number;
  price_unit: number;
  discount: number;
  _deleted: boolean;
  _isNew: boolean;
}

interface SearchProduct {
  id: number;
  name: string;
  barcode: string;
  list_price: number;
  standard_price: number;
  taxes_id: number[];
}

const props = defineProps<{
  isOpen: boolean;
  orderId: number | null;
}>();

const emit = defineEmits<{
  (e: "update:isOpen", value: boolean): void;
  (e: "refresh"): void;
}>();

let keyCounter = 0;
function nextKey() {
  return ++keyCounter;
}

const loading = ref(false);
const saving = ref(false);
const error = ref("");
const toast = ref<{
  show: boolean;
  message: string;
  type: "success" | "error";
}>({
  show: false,
  message: "",
  type: "success",
});

const order = ref<POSOrder | null>(null);
const lines = ref<OrderLine[]>([]);
const payments = ref<OrderPayment[]>([]);
const editingPayments = ref<Record<number, number>>({});
const originalPayments = ref<OrderPayment[]>([]);

const editingLines = ref<EditableLine[]>([]);
const orderDiscount = ref(0);
const orderDiscountType = ref<"fixed" | "percent">("fixed");
const serviceFee = ref(0);
const serviceFeeType = ref<"fixed" | "percent">("fixed");
const editingCustomerId = ref<number | null>(null);
const editingCustomerName = ref("");
const orderNote = ref("");
const editingState = ref("");
const showDiscountEditor = ref(false);
const showServiceFeeEditor = ref(false);
const showCustomerEditor = ref(false);
const showNoteEditor = ref(false);
const showStateEditor = ref(false);

const productSearchQuery = ref("");
const productSearchResults = ref<SearchProduct[]>([]);
const productSearchLoading = ref(false);
const showProductSearch = ref(false);

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  paid: "مدفوع",
  done: "منتهي",
  cancelled: "ملغي",
  invoiced: "مفوتر",
  refund: "مرتجع",
};

const activeLines = computed(() =>
  editingLines.value.filter((l) => !l._deleted),
);

const editSubtotal = computed(() =>
  activeLines.value.reduce((sum, l) => {
    const lineTotal = l.price_unit * l.qty;
    const discountAmt = lineTotal * (l.discount / 100);
    return sum + lineTotal - discountAmt;
  }, 0),
);

const editDiscountAmount = computed(() => {
  if (orderDiscountType.value === "percent") {
    return (editSubtotal.value * orderDiscount.value) / 100;
  }
  return orderDiscount.value;
});

const editServiceFeeAmount = computed(() => {
  if (serviceFeeType.value === "percent") {
    return (editSubtotal.value * serviceFee.value) / 100;
  }
  return serviceFee.value;
});

const editGrandTotal = computed(() =>
  Math.max(
    0,
    editSubtotal.value +
      (order.value?.amount_tax || 0) +
      editServiceFeeAmount.value -
      editDiscountAmount.value,
  ),
);

const hasChanges = computed(() => {
  if (!order.value) return false;
  const origDiscount = Number(order.value.order_discount || 0);
  const origFee = Number(order.value.service_fee || 0);
  if (orderDiscount.value !== origDiscount) return true;
  if (serviceFee.value !== origFee) return true;
  if (orderDiscountType.value !== (order.value.order_discount_type || "fixed"))
    return true;
  if (serviceFeeType.value !== (order.value.service_fee_type || "fixed"))
    return true;
  if (
    (editingCustomerId.value || null) !== (order.value.partner_id?.[0] || null)
  )
    return true;
  if (orderNote.value !== (order.value.note || "")) return true;
  if (editingState.value !== (order.value.state || "")) return true;
  for (const line of editingLines.value) {
    const orig = lines.value.find((l) => l.id === line.id);
    if (line._deleted && orig) return true;
    if (line._isNew) return true;
    if (!orig) return true;
    if (orig.qty !== line.qty) return true;
    if (orig.price_unit !== line.price_unit) return true;
    if (orig.discount !== line.discount) return true;
  }
  for (const pay of payments.value) {
    const origPay = originalPayments.value.find((p) => p.id === pay.id);
    if (!origPay) return true;
    if (editingPayments.value[pay.id] !== origPay.amount) return true;
  }
  if (payments.value.length !== originalPayments.value.length) return true;
  return false;
});

const canEditPrice = computed(() => can.value("order.editPrice"));

const availablePaymentMethods = ref<PaymentMethod[]>([]);
const showAddPayment = ref(false);
const newPaymentName = ref("");
const newPaymentAmount = ref(0);
const addPaymentError = ref("");

watch(
  () => props.isOpen,
  (open) => {
    if (open && props.orderId) {
      fetchDetail(props.orderId);
      fetchReceiptConfig();
    }
  },
);

async function fetchDetail(orderId: number) {
  loading.value = true;
  error.value = "";
  try {
    const data = await $fetch<any>("/api/orders/detail", {
      query: { id: orderId },
    });
    if (data.success) {
      order.value = data.order;
      lines.value = data.lines || [];
      payments.value = data.payments || [];
      originalPayments.value = (data.payments || []).map((p: OrderPayment) => ({ ...p }));
      const methods = data.payment_methods || [];
      const seen = new Set<string>();
      availablePaymentMethods.value = methods.filter((m: PaymentMethod) => {
        if (seen.has(m.name)) return false;
        seen.add(m.name);
        return true;
      });
      editingPayments.value = {};
      for (const p of data.payments || []) {
        editingPayments.value[p.id] = p.amount;
      }
      initEditMode();
    } else {
      error.value = data.message || "فشل تحميل تفاصيل الطلب";
    }
  } catch (err: any) {
    error.value = err.message || err.statusMessage || "خطأ في الاتصال بالخادم";
  } finally {
    loading.value = false;
  }
}

function initEditMode() {
  if (!order.value) return;
  editingLines.value = lines.value.map((l) => ({
    _key: nextKey(),
    id: l.id,
    product_id: l.product_id,
    qty: l.qty,
    price_unit: l.price_unit,
    discount: l.discount,
    _deleted: false,
    _isNew: false,
  }));
  orderDiscount.value = Number(order.value.order_discount || 0);
  orderDiscountType.value =
    (order.value.order_discount_type as "fixed" | "percent") || "fixed";
  serviceFee.value = Number(order.value.service_fee || 0);
  serviceFeeType.value =
    (order.value.service_fee_type as "fixed" | "percent") || "fixed";
  editingCustomerId.value = order.value.partner_id?.[0] || null;
  editingCustomerName.value = order.value.partner_id?.[1] || "";
  orderNote.value = order.value.note || "";
  editingState.value = order.value.state || "";
  showDiscountEditor.value = false;
  showServiceFeeEditor.value = false;
  showCustomerEditor.value = false;
  showNoteEditor.value = false;
  showProductSearch.value = false;
  productSearchQuery.value = "";
  productSearchResults.value = [];
}

function closeDrawer() {
  emit("update:isOpen", false);
  order.value = null;
  lines.value = [];
  payments.value = [];
  error.value = "";
  editingLines.value = [];
  originalPayments.value = [];
  showAddPayment.value = false;
  newPaymentName.value = "";
  newPaymentAmount.value = 0;
  addPaymentError.value = "";
  availablePaymentMethods.value = [];
}

function showToast(message: string, type: "success" | "error") {
  toast.value = { show: true, message, type };
  setTimeout(() => {
    toast.value.show = false;
  }, 3000);
}

function addQty(line: EditableLine) {
  line.qty = Math.max(0.01, line.qty + 1);
}

function subQty(line: EditableLine) {
  if (line.qty <= 1) {
    removeEditingLine(line);
    return;
  }
  line.qty = Math.max(0.01, line.qty - 1);
}

function removeEditingLine(line: EditableLine) {
  if (line._isNew) {
    editingLines.value = editingLines.value.filter((l) => l._key !== line._key);
  } else {
    line._deleted = true;
  }
}

let productSearchTimeout: ReturnType<typeof setTimeout>;
async function handleProductSearch(val: string) {
  clearTimeout(productSearchTimeout);
  if (!val.trim()) {
    productSearchResults.value = [];
    productSearchLoading.value = false;
    return;
  }
  productSearchLoading.value = true;
  productSearchTimeout = setTimeout(async () => {
    try {
      const res = await $fetch<{ success: boolean; data: SearchProduct[] }>(
        "/api/products/search",
        { query: { query: val } },
      );
      productSearchResults.value = res?.data || [];
    } catch {
      productSearchResults.value = [];
    } finally {
      productSearchLoading.value = false;
    }
  }, 300);
}

function addProductToOrder(product: SearchProduct) {
  editingLines.value.push({
    _key: nextKey(),
    id: null,
    product_id: [product.id, product.name],
    qty: 1,
    price_unit: product.list_price,
    discount: 0,
    _deleted: false,
    _isNew: true,
  });
  productSearchQuery.value = "";
  productSearchResults.value = [];
  showProductSearch.value = false;
}

function toggleAddPayment() {
  showAddPayment.value = !showAddPayment.value;
  if (!showAddPayment.value && availablePaymentMethods.value.length > 0) {
    newPaymentName.value = availablePaymentMethods.value[0]?.name || "";
  }
}

function addPaymentLine() {
  addPaymentError.value = "";
  if (!newPaymentName.value.trim()) {
    addPaymentError.value = "يرجى إدخال اسم طريقة الدفع";
    return;
  }
  if (newPaymentAmount.value <= 0) {
    addPaymentError.value = "يرجى إدخال مبلغ صحيح";
    return;
  }

  const tempId = -Date.now();
  const method = availablePaymentMethods.value.find(
    (m) => m.name === newPaymentName.value.trim(),
  );
  if (!method) {
    addPaymentError.value = "طريقة الدفع المحددة غير موجودة";
    return;
  }
  payments.value.push({
    id: tempId,
    payment_method_id: [method.id, newPaymentName.value.trim()],
    amount: newPaymentAmount.value,
    payment_date: "",
    payment_status: "paid",
  });
  editingPayments.value[tempId] = newPaymentAmount.value;
  newPaymentName.value = "";
  newPaymentAmount.value = 0;
}

async function saveOrderChanges() {
  if (!order.value) return;
  saving.value = true;
  try {
    const items = editingLines.value.map((l) => ({
      line_id: l.id,
      product_id: l.product_id[0],
      qty: l.qty,
      price: l.price_unit,
      discount: l.discount,
      _deleted: l._deleted,
    }));
    const paymentsPayload = payments.value.map((p) => ({
      id: p.id < 0 ? null : p.id,
      method_id: p.payment_method_id[0],
      amount: editingPayments.value[p.id] ?? p.amount,
    }));
    const res = await $fetch<any>("/api/orders/update", {
      method: "POST",
      body: {
        order_id: order.value.id,
        items,
        order_discount: orderDiscount.value,
        order_discount_type: orderDiscountType.value,
        service_fee: serviceFee.value,
        service_fee_type: serviceFeeType.value,
        customer_id: editingCustomerId.value || false,
        note: orderNote.value,
        state: editingState.value || false,
        payments: paymentsPayload,
      },
    });
    if (res.success) {
      showToast("تم تحديث الطلب بنجاح", "success");
      emit("refresh");
      await fetchDetail(order.value.id);
    } else {
      showToast(res.message || "فشل تحديث الطلب", "error");
    }
  } catch (err: any) {
    showToast(err.message || "فشل تحديث الطلب", "error");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity flex justify-center"
    @click="closeDrawer"
  >
    <div
      class="h-full w-full bg-white shadow-2xl flex flex-col relative transition-transform duration-300"
      @click.stop
    >
      <!-- Header -->
      <div
        class="p-6 border-b border-outline-variant flex items-center justify-between bg-white shrink-0"
      >
        <div>
          <h4 class="text-headline-sm font-bold text-on-white">
            تعديل الطلب
          </h4>
          <p v-if="order" class="text-label-md text-on-white-variant mt-0.5">
            {{ order.name }}
          </p>
        </div>
        <button
          @click="closeDrawer"
          class="p-2 rounded-full hover:bg-white-highest transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <div class="flex flex-col items-center gap-3 text-on-white-variant">
          <LoaderCircle class="w-8 h-8 animate-spin text-primary" />
          <span class="text-[13px]">جاري تحميل تفاصيل الطلب...</span>
        </div>
      </div>

      <!-- Error -->
      <div
        v-else-if="error && !order"
        class="flex-1 flex flex-col items-center justify-center p-8 gap-4"
      >
        <AlertCircle class="w-12 h-12 text-error" />
        <p class="text-error font-bold text-center">{{ error }}</p>
        <button
          @click="orderId && fetchDetail(orderId)"
          class="px-6 py-2 bg-error text-on-error rounded-full font-bold active:scale-95 transition-all cursor-pointer"
        >
          إعادة المحاولة
        </button>
      </div>

      <!-- Content -->
      <div
        v-else-if="order"
        class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar max-w-7xl mx-auto w-full"
      >
        <!-- Order Lines -->
        <div>
          <h5
            class="text-label-md font-bold text-primary border-r-4 border-primary pr-3 mb-3"
          >
            أصناف الفاتورة
          </h5>
          <div class="overflow-x-auto">
            <table class="w-full text-right border-collapse">
              <thead>
                <tr
                  class="bg-white-low text-on-white-variant border-b border-outline-variant"
                >
                  <th class="px-2 py-2 text-[11px] font-bold">المنتج</th>
                  <th class="px-2 py-2 text-[11px] font-bold">الكمية</th>
                  <th class="px-2 py-2 text-[11px] font-bold">السعر</th>
                  <th class="px-2 py-2 text-[11px] font-bold">الإجمالي</th>
                  <th class="px-2 py-2 text-[11px] font-bold"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/40">
                <tr
                  v-for="line in editingLines"
                  :key="line._key"
                  :class="[
                    'hover:bg-white-low/50 transition-all',
                    line._deleted ? 'opacity-40 line-through bg-error/5' : '',
                  ]"
                >
                  <td
                    class="px-2 py-2 text-body-md font-bold text-on-white whitespace-nowrap"
                  >
                    <div class="flex items-center gap-1.5">
                      <span
                        v-if="line._isNew"
                        class="w-1.5 h-1.5 rounded-full bg-success shrink-0"
                      />
                      <span>{{ line.product_id[1] }}</span>
                    </div>
                  </td>
                  <td class="px-2 py-2">
                    <div
                      class="flex items-center gap-1"
                      v-if="!line._deleted"
                    >
                      <button
                        @click="subQty(line)"
                        class="w-7 h-7 flex items-center justify-center rounded-md border border-outline-variant hover:bg-white-highest transition-colors cursor-pointer text-on-white-variant"
                      >
                        <Minus class="w-3 h-3" />
                      </button>
                      <input
                        v-model.number="line.qty"
                        type="number"
                        min="0.01"
                        step="1"
                        class="w-14 h-7 text-center bg-white border border-outline-variant rounded-md text-body-md outline-none focus:border-primary tabular-nums"
                      />
                      <button
                        @click="addQty(line)"
                        class="w-7 h-7 flex items-center justify-center rounded-md border border-outline-variant hover:bg-white-highest transition-colors cursor-pointer text-on-white-variant"
                      >
                        <Plus class="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td class="px-2 py-2">
                    <div v-if="!line._deleted" class="relative inline-block">
                      <input
                        v-model.number="line.price_unit"
                        type="number"
                        min="0"
                        step="0.01"
                        :disabled="!canEditPrice"
                        class="w-20 h-7 px-1.5 bg-white border border-outline-variant rounded-md text-body-md outline-none focus:border-primary tabular-nums disabled:opacity-50 disabled:bg-white-low"
                      />
                    </div>
                  </td>
                  <td
                    class="px-2 py-2 text-body-md font-bold text-primary tabular-nums"
                  >
                    {{
                      (
                        line.price_unit *
                        line.qty *
                        (1 - line.discount / 100)
                      ).toFixed(2)
                    }}
                  </td>
                  <td class="px-2 py-2">
                    <button
                      @click="removeEditingLine(line)"
                      class="p-1 rounded-lg hover:bg-error/10 text-error/70 hover:text-error transition-colors cursor-pointer"
                      title="حذف الصنف"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
                <tr v-if="activeLines.length === 0">
                  <td
                    colspan="6"
                    class="p-6 text-center text-on-white-variant text-sm"
                  >
                    لا توجد أصناف في هذه الفاتورة
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Add Product Search -->
          <div class="mt-3 space-y-2">
            <button
              @click="showProductSearch = !showProductSearch"
              class="w-full flex items-center justify-between px-4 py-3 bg-white border border-dashed border-outline-variant rounded-xl text-sm font-bold text-primary hover:bg-primary/5 transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-2">
                <Plus class="w-4 h-4" />
                <span>إضافة منتج</span>
              </div>
              <span class="text-xs text-on-white-variant">{{
                showProductSearch ? "إخفاء" : "إضافة"
              }}</span>
            </button>
            <div
              v-if="showProductSearch"
              class="bg-white-low border border-outline-variant rounded-xl p-3 space-y-2"
            >
              <div class="relative">
                <Search
                  class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-white-variant"
                />
                <input
                  v-model="productSearchQuery"
                  @input="handleProductSearch(productSearchQuery)"
                  type="text"
                  placeholder="ابحث عن منتج بالاسم أو الباركود..."
                  class="w-full h-10 pr-10 bg-white border border-outline-variant rounded-lg px-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div
                v-if="productSearchLoading"
                class="text-center text-xs text-on-white-variant py-3"
              >
                جاري البحث...
              </div>
              <div
                v-else-if="productSearchResults.length > 0"
                class="max-h-48 overflow-y-auto space-y-1"
              >
                <button
                  v-for="prod in productSearchResults"
                  :key="prod.id"
                  @click="addProductToOrder(prod)"
                  class="w-full text-right px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/5 text-on-white transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span>{{ prod.name }}</span>
                  <span class="text-xs text-on-white-variant tabular-nums"
                    >{{ prod.list_price.toFixed(2) }} ج.م</span
                  >
                </button>
              </div>
              <div
                v-else-if="productSearchQuery && !productSearchLoading"
                class="text-center text-xs text-on-white-variant py-3"
              >
                لا توجد نتائج
              </div>
            </div>
          </div>
        </div>

        <!-- Order Adjustments -->
        <div class="space-y-3">
          <h5
            class="text-label-md font-bold text-primary border-r-4 border-primary pr-3 mb-3"
          >
            تعديلات الطلب
          </h5>

          <!-- Discount Editor -->
          <div
            class="bg-white border border-outline-variant rounded-xl overflow-hidden"
          >
            <button
              @click="showDiscountEditor = !showDiscountEditor"
              class="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-on-white hover:bg-white-low transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-2">
                <Percent class="w-4 h-4 text-error" />
                <span>خصم على الفاتورة</span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  v-if="orderDiscount > 0"
                  class="text-xs text-error font-bold"
                >
                  {{
                    orderDiscountType === "percent"
                      ? `${orderDiscount}%`
                      : `${orderDiscount} ج.م`
                  }}
                </span>
                <span class="text-xs text-on-white-variant">{{
                  showDiscountEditor ? "إخفاء" : "تعديل"
                }}</span>
              </div>
            </button>
            <div v-if="showDiscountEditor" class="px-4 pb-4 space-y-3">
              <div class="flex gap-2">
                <button
                  @click="orderDiscountType = 'fixed'"
                  :class="[
                    'flex-1 h-9 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    orderDiscountType === 'fixed'
                      ? 'bg-error text-white shadow-sm'
                      : 'bg-white-low text-on-white-variant hover:bg-outline-variant',
                  ]"
                >
                  قيمة ثابتة
                </button>
                <button
                  @click="orderDiscountType = 'percent'"
                  :class="[
                    'flex-1 h-9 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    orderDiscountType === 'percent'
                      ? 'bg-error text-white shadow-sm'
                      : 'bg-white-low text-on-white-variant hover:bg-outline-variant',
                  ]"
                >
                  نسبة %
                </button>
              </div>
              <div class="relative">
                <input
                  v-model.number="orderDiscount"
                  type="number"
                  min="0"
                  step="0.01"
                  :placeholder="orderDiscountType === 'fixed' ? '0.00' : '0'"
                  class="w-full h-10 bg-white border border-outline-variant rounded-lg px-3 text-sm focus:ring-2 focus:ring-error focus:outline-none tabular-nums"
                />
                <span
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-on-white-variant"
                >
                  {{ orderDiscountType === "fixed" ? "ج.م" : "%" }}
                </span>
              </div>
              <div
                v-if="editDiscountAmount > 0"
                class="text-left text-xs text-error font-bold"
              >
                قيمة الخصم: {{ editDiscountAmount.toFixed(2) }} ج.م
              </div>
            </div>
          </div>

          <!-- Service Fee Editor -->
          <div
            class="bg-white border border-outline-variant rounded-xl overflow-hidden"
          >
            <button
              @click="showServiceFeeEditor = !showServiceFeeEditor"
              class="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-on-white hover:bg-white-low transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-2">
                <Plus class="w-4 h-4 text-amber-500" />
                <span>رسوم إضافية</span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  v-if="serviceFee > 0"
                  class="text-xs text-amber-600 font-bold"
                >
                  {{
                    serviceFeeType === "percent"
                      ? `${serviceFee}%`
                      : `${serviceFee} ج.م`
                  }}
                </span>
                <span class="text-xs text-on-white-variant">{{
                  showServiceFeeEditor ? "إخفاء" : "تعديل"
                }}</span>
              </div>
            </button>
            <div v-if="showServiceFeeEditor" class="px-4 pb-4 space-y-3">
              <div class="flex gap-2">
                <button
                  @click="serviceFeeType = 'fixed'"
                  :class="[
                    'flex-1 h-9 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    serviceFeeType === 'fixed'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-white-low text-on-white-variant hover:bg-outline-variant',
                  ]"
                >
                  قيمة ثابتة
                </button>
                <button
                  @click="serviceFeeType = 'percent'"
                  :class="[
                    'flex-1 h-9 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    serviceFeeType === 'percent'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-white-low text-on-white-variant hover:bg-outline-variant',
                  ]"
                >
                  نسبة %
                </button>
              </div>
              <div class="relative">
                <input
                  v-model.number="serviceFee"
                  type="number"
                  min="0"
                  step="0.01"
                  :placeholder="serviceFeeType === 'fixed' ? '0.00' : '0'"
                  class="w-full h-10 bg-white border border-outline-variant rounded-lg px-3 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none tabular-nums"
                />
                <span
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-on-white-variant"
                >
                  {{ serviceFeeType === "fixed" ? "ج.م" : "%" }}
                </span>
              </div>
              <div
                v-if="editServiceFeeAmount > 0"
                class="text-left text-xs text-amber-600 font-bold"
              >
                قيمة الرسوم: {{ editServiceFeeAmount.toFixed(2) }} ج.م
              </div>
            </div>
          </div>

          <!-- Customer Editor -->
          <div
            class="bg-white border border-outline-variant rounded-xl overflow-hidden"
          >
            <button
              @click="showCustomerEditor = !showCustomerEditor"
              class="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-on-white hover:bg-white-low transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-2">
                <User class="w-4 h-4 text-purple-500" />
                <span>العميل</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-purple-600 font-medium">{{
                  editingCustomerName || "عميل نقدي"
                }}</span>
                <span class="text-xs text-on-white-variant">{{
                  showCustomerEditor ? "إخفاء" : "تعديل"
                }}</span>
              </div>
            </button>
            <div v-if="showCustomerEditor" class="px-4 pb-4">
              <div class="flex items-center gap-2">
                <input
                  v-model="editingCustomerName"
                  placeholder="اسم العميل"
                  class="flex-1 h-10 bg-white border border-outline-variant rounded-lg px-3 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <button
                  v-if="editingCustomerName"
                  @click="
                    editingCustomerName = '';
                    editingCustomerId = null;
                  "
                  class="shrink-0 px-3 h-10 bg-white-low text-on-white-variant rounded-lg hover:bg-outline-variant transition-colors text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
              <p class="text-[10px] text-on-white-variant mt-1.5">
                أدخل اسم العميل. سيتم البحث عن العميل أو حفظه تلقائياً.
              </p>
            </div>
          </div>

          <!-- Note Editor -->
          <div
            class="bg-white border border-outline-variant rounded-xl overflow-hidden"
          >
            <button
              @click="showNoteEditor = !showNoteEditor"
              class="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-on-white hover:bg-white-low transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-2">
                <MessageSquareText class="w-4 h-4 text-blue-500" />
                <span>ملاحظات</span>
              </div>
              <span class="text-xs text-on-white-variant">{{
                showNoteEditor ? "إخفاء" : "تعديل"
              }}</span>
            </button>
            <div v-if="showNoteEditor" class="px-4 pb-4">
              <textarea
                v-model="orderNote"
                rows="3"
                placeholder="ملاحظات على الطلب..."
                class="w-full bg-white border border-outline-variant rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          <!-- State Editor -->
          <div
            class="bg-white border border-outline-variant rounded-xl overflow-hidden"
          >
            <button
              @click="showStateEditor = !showStateEditor"
              class="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-on-white hover:bg-white-low transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-2">
                <CheckCheck class="w-4 h-4 text-emerald-500" />
                <span>حالة الطلب</span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="px-2 py-0.5 rounded-full text-[11px] font-bold"
                  :class="
                    editingState === 'paid'
                      ? 'bg-primary/10 text-primary'
                      : editingState === 'done'
                        ? 'bg-success/10 text-success'
                        : editingState === 'cancelled'
                          ? 'bg-error/10 text-error'
                          : 'bg-secondary-container text-secondary'
                  "
                >
                  {{ statusLabels[editingState] || editingState }}
                </span>
                <span class="text-xs text-on-white-variant">{{
                  showStateEditor ? "إخفاء" : "تعديل"
                }}</span>
              </div>
            </button>
            <div v-if="showStateEditor" class="px-4 pb-4">
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="(label, key) in statusLabels"
                  :key="key"
                  @click="editingState = key"
                  :class="[
                    'h-10 rounded-lg text-xs font-bold transition-all cursor-pointer border',
                    editingState === key
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white border-outline-variant text-on-white hover:bg-white-low',
                  ]"
                >
                  {{ label }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Payments -->
        <div>
          <h5
            class="text-label-md font-bold text-primary border-r-4 border-primary pr-3 mb-3"
          >
            المدفوعات
          </h5>
          <div class="overflow-x-auto">
            <table class="w-full text-right border-collapse">
              <thead>
                <tr
                  class="bg-white-low text-on-white-variant border-b border-outline-variant"
                >
                  <th class="px-3 py-2 text-[11px] font-bold">طريقة الدفع</th>
                  <th class="px-3 py-2 text-[11px] font-bold">المبلغ</th>
                  <th class="px-3 py-2 text-[11px] font-bold">الحالة</th>
                  <th class="px-3 py-2 text-[11px] font-bold"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/40">
                <tr
                  v-for="pay in payments"
                  :key="pay.id"
                  class="hover:bg-white-low/50"
                >
                  <td class="px-3 py-3 text-body-md text-on-white">
                    {{
                      pay.payment_method_id
                        ? pay.payment_method_id[1]
                        : `#${pay.payment_method_id?.[0] || ""}`
                    }}
                  </td>
                  <td class="px-3 py-3">
                    <div class="relative inline-block">
                      <input
                        v-model.number="editingPayments[pay.id]"
                        type="number"
                        step="0.01"
                        class="w-28 h-9 px-2 bg-white border border-outline-variant rounded-lg text-body-md font-bold text-primary outline-none focus:border-primary"
                      />
                      <span class="mr-1 text-on-white-variant text-xs"
                        >ج.م</span
                      >
                    </div>
                  </td>
                  <td class="px-3 py-3">
                    <span
                      class="px-2 py-0.5 rounded-full text-[11px] font-bold"
                      :class="
                        pay.payment_status === 'paid'
                          ? 'bg-primary/10 text-primary'
                          : pay.payment_status === 'reversed'
                            ? 'bg-error-container text-error'
                            : 'bg-secondary-container text-secondary'
                      "
                    >
                      {{
                        pay.payment_status === "paid"
                          ? "مدفوع"
                          : pay.payment_status === "reversed"
                            ? "مرتجع"
                            : "معلق"
                      }}
                    </span>
                  </td>
                  <td class="px-3 py-3">
                    <button
                      @click="
                        payments = payments.filter((p) => p.id !== pay.id)
                      "
                      class="p-1.5 rounded-lg hover:bg-error/10 text-error/70 hover:text-error transition-colors cursor-pointer disabled:opacity-30"
                      title="حذف الدفعة"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                <tr v-if="payments.length === 0">
                  <td
                    colspan="4"
                    class="p-6 text-center text-on-white-variant text-sm"
                  >
                    لا توجد مدفوعات مسجلة
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Add Payment Method Form -->
          <div class="mt-3 space-y-3">
            <button
              @click="toggleAddPayment"
              class="w-full flex items-center justify-between px-4 py-3 bg-white border border-dashed border-outline-variant rounded-xl text-sm font-bold text-primary hover:bg-primary/5 transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-2">
                <Plus class="w-4 h-4" />
                <span>إضافة طريقة دفع</span>
              </div>
              <span class="text-xs text-on-white-variant">{{
                showAddPayment ? "إخفاء" : "إضافة"
              }}</span>
            </button>

            <div
              v-if="showAddPayment"
              class="bg-white-low border border-outline-variant rounded-xl p-4 space-y-3"
            >
              <div>
                <label
                  class="block text-xs font-bold text-on-white-variant mb-1"
                  >طريقة الدفع</label
                >
                <div class="relative">
                  <Wallet
                    class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-white-variant"
                  />
                  <select
                    v-model="newPaymentName"
                    class="w-full h-10 pr-10 bg-white border border-outline-variant rounded-lg px-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none cursor-pointer"
                  >
                    <option value="" disabled>اختر طريقة الدفع</option>
                    <option
                      v-for="method in availablePaymentMethods"
                      :key="method.id"
                      :value="method.name"
                    >
                      {{ method.name }}
                    </option>
                  </select>
                </div>
              </div>
              <div>
                <label
                  class="block text-xs font-bold text-on-white-variant mb-1"
                  >المبلغ</label
                >
                <div class="relative">
                  <input
                    v-model.number="newPaymentAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    class="w-full h-10 bg-white border border-outline-variant rounded-lg px-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none tabular-nums"
                  />
                  <span
                    class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-on-white-variant"
                    >ج.م</span
                  >
                </div>
              </div>
              <p v-if="addPaymentError" class="text-xs text-error font-medium">
                {{ addPaymentError }}
              </p>
              <button
                @click="addPaymentLine"
                class="w-full h-10 bg-primary text-white rounded-lg font-bold hover:bg-primary/95 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 text-sm"
              >
                <Plus class="w-4 h-4" />
                إضافة
              </button>
            </div>
          </div>
        </div>

        <!-- Totals Summary -->
        <div
          class="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2"
        >
          <div class="flex justify-between text-body-md">
            <span class="text-on-white-variant">المجموع الفرعي</span>
            <span class="font-bold tabular-nums">
              {{ editSubtotal.toFixed(2) }} ج.م
            </span>
          </div>
          <div
            v-if="editDiscountAmount > 0"
            class="flex justify-between text-body-md text-error"
          >
            <span>الخصم</span>
            <span class="font-bold tabular-nums"
              >-{{ editDiscountAmount.toFixed(2) }} ج.م</span
            >
          </div>
          <div
            v-if="editServiceFeeAmount > 0"
            class="flex justify-between text-body-md text-amber-600"
          >
            <span>رسوم إضافية</span>
            <span class="font-bold tabular-nums"
              >+{{ editServiceFeeAmount.toFixed(2) }} ج.م</span
            >
          </div>
          <div class="flex justify-between text-body-md">
            <span class="text-on-white-variant">الضريبة</span>
            <span class="font-bold tabular-nums"
              >{{ Number(order.amount_tax).toFixed(2) }} ج.م</span
            >
          </div>
          <div
            class="flex justify-between text-headline-sm font-bold text-primary border-t border-primary/20 pt-2"
          >
            <span>الإجمالي</span>
            <span class="tabular-nums">
              {{ editGrandTotal.toFixed(2) }} ج.م
            </span>
          </div>
          <div
            v-if="hasChanges"
            class="text-[10px] text-amber-600 font-medium text-left mt-1"
          >
            * يتم إعادة حساب الضريبة والإجمالي بعد الحفظ من الخادم
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="p-4 bg-white-high border-t border-outline-variant shrink-0 space-y-3"
      >
        <div class="flex gap-3">
          <button
            @click="closeDrawer"
            :disabled="saving"
            class="flex-1 py-3 rounded-xl border border-outline font-bold text-on-white hover:bg-white transition-all cursor-pointer active:scale-95 text-center disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            @click="saveOrderChanges"
            :disabled="saving || !hasChanges"
            class="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/95 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LoaderCircle v-if="saving" class="w-4 h-4 animate-spin" />
            <Save v-else class="w-4 h-4" />
            {{ saving ? "جاري الحفظ..." : "حفظ التغييرات" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div
      class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 bg-white text-primary"
      :class="
        toast.show
          ? 'translate-y-0 opacity-100'
          : 'translate-y-32 opacity-0 pointer-events-none'
      "
    >
      <div
        class="px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
        :class="
          toast.type === 'success'
            ? 'bg-on-white text-white'
            : 'bg-error text-on-error'
        "
      >
        <component
          :is="toast.type === 'success' ? CheckCheck : AlertCircle"
          class="w-5 h-5 shrink-0"
        />
        <p class="font-bold text-sm">{{ toast.message }}</p>
      </div>
    </div>
  </div>
</template>

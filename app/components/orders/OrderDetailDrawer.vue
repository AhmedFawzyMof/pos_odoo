<script setup lang="ts">
import { ref, watch, computed } from "vue";
import {
  X,
  LoaderCircle,
  Trash2,
  AlertCircle,
  CheckCheck,
  Edit3,
  Save,
  Plus,
  Wallet,
  Printer,
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
import { usePermissions } from '~/composables/usePermissions'
import { useReceiptPrint } from '~/composables/useReceiptPrint'
import { useNumberFormat } from '~/composables/useNumberFormat'
const { can } = usePermissions()
const { fetchReceiptConfig, printReceipt } = useReceiptPrint()
const { formatNumber } = useNumberFormat()

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

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    orderId: number | null;
    openInEditMode?: boolean;
  }>(),
  { openInEditMode: false },
);

const emit = defineEmits<{
  (e: "update:isOpen", value: boolean): void;
  (e: "update:openInEditMode", value: boolean): void;
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
const selectedStatus = ref("");
const showAddPayment = ref(false);
const newPaymentName = ref("");
const newPaymentAmount = ref(0);
const addPaymentError = ref("");
const availablePaymentMethods = ref<PaymentMethod[]>([]);

const editMode = ref(false);
const editingLines = ref<EditableLine[]>([]);
const orderDiscount = ref(0);
const orderDiscountType = ref<"fixed" | "percent">("fixed");
const serviceFee = ref(0);
const serviceFeeType = ref<"fixed" | "percent">("fixed");
const editingCustomerId = ref<number | null>(null);
const editingCustomerName = ref("");
const orderNote = ref("");
const showDiscountEditor = ref(false);
const showServiceFeeEditor = ref(false);
const showCustomerEditor = ref(false);
const showNoteEditor = ref(false);

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

const statusColors: Record<string, string> = {
  draft: "bg-secondary-container text-secondary",
  paid: "bg-primary/10 text-primary",
  done: "bg-tertiary-container/30 text-tertiary",
  cancelled: "bg-error-container text-error",
  invoiced: "bg-secondary-fixed text-on-secondary-fixed",
  refund: "bg-amber-100 text-amber-700",
};

const totalFromLines = computed(() =>
  lines.value.reduce((sum, l) => sum + l.price_subtotal, 0),
);

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
    editSubtotal.value + (order.value?.amount_tax || 0) + editServiceFeeAmount.value - editDiscountAmount.value,
  ),
);

const hasChanges = computed(() => {
  if (!order.value) return false;
  const origDiscount = Number(order.value.order_discount || 0);
  const origFee = Number(order.value.service_fee || 0);
  if (orderDiscount.value !== origDiscount) return true;
  if (serviceFee.value !== origFee) return true;
  if (
    orderDiscountType.value !== (order.value.order_discount_type || "fixed")
  ) return true;
  if (serviceFeeType.value !== (order.value.service_fee_type || "fixed")) return true;
  if ((editingCustomerId.value || null) !== (order.value.partner_id?.[0] || null)) return true;
  if (orderNote.value !== (order.value.note || "")) return true;
  for (const line of editingLines.value) {
    const orig = lines.value.find((l) => l.id === line.id);
    if (line._deleted && orig) return true;
    if (line._isNew) return true;
    if (!orig) return true;
    if (orig.qty !== line.qty) return true;
    if (orig.price_unit !== line.price_unit) return true;
    if (orig.discount !== line.discount) return true;
  }
  return false;
});

const canEditPrice = computed(() => can.value('order.editPrice'));

watch(
  () => props.isOpen,
  (open) => {
    if (open && props.orderId) {
      editMode.value = false;
      fetchDetail(props.orderId).then(() => {
        if (props.openInEditMode) {
          enterEditMode();
          emit("update:openInEditMode", false);
        }
      });
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
      const methods = data.payment_methods || [];
      const seen = new Set<string>();
      availablePaymentMethods.value = methods.filter((m: PaymentMethod) => {
        if (seen.has(m.name)) return false;
        seen.add(m.name);
        return true;
      });
      selectedStatus.value = data.order.state;
      editingPayments.value = {};
      for (const p of data.payments || []) {
        editingPayments.value[p.id] = p.amount;
      }
    } else {
      error.value = data.message || "فشل تحميل تفاصيل الطلب";
    }
  } catch (err: any) {
    error.value = err.message || err.statusMessage || "خطأ في الاتصال بالخادم";
  } finally {
    loading.value = false;
  }
}

function enterEditMode() {
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
  orderDiscountType.value = (order.value.order_discount_type as "fixed" | "percent") || "fixed";
  serviceFee.value = Number(order.value.service_fee || 0);
  serviceFeeType.value = (order.value.service_fee_type as "fixed" | "percent") || "fixed";
  editingCustomerId.value = order.value.partner_id?.[0] || null;
  editingCustomerName.value = order.value.partner_id?.[1] || "";
  orderNote.value = order.value.note || "";
  showDiscountEditor.value = false;
  showServiceFeeEditor.value = false;
  showCustomerEditor.value = false;
  showNoteEditor.value = false;
  showProductSearch.value = false;
  productSearchQuery.value = "";
  productSearchResults.value = [];
  editMode.value = true;
}

function cancelEdit() {
  editMode.value = false;
  editingLines.value = [];
  orderDiscount.value = 0;
  serviceFee.value = 0;
  editingCustomerId.value = null;
  editingCustomerName.value = "";
  orderNote.value = "";
}

function closeDrawer() {
  emit("update:isOpen", false);
  order.value = null;
  lines.value = [];
  payments.value = [];
  error.value = "";
  showAddPayment.value = false;
  newPaymentName.value = "";
  newPaymentAmount.value = 0;
  addPaymentError.value = "";
  availablePaymentMethods.value = [];
  editMode.value = false;
}

function showToast(message: string, type: "success" | "error") {
  toast.value = { show: true, message, type };
  setTimeout(() => {
    toast.value.show = false;
  }, 3000);
}

async function changeStatus() {
  if (
    !order.value ||
    !selectedStatus.value ||
    selectedStatus.value === order.value.state
  )
    return;
  saving.value = true;
  try {
    const res = await $fetch<any>("/api/orders/status", {
      method: "POST",
      body: { order_id: order.value.id, state: selectedStatus.value },
    });
    if (res.success) {
      showToast("تم تحديث حالة الطلب بنجاح", "success");
      order.value.state = selectedStatus.value as any;
      emit("refresh");
      if (order.value) fetchDetail(order.value.id);
    } else {
      showToast(res.message || "فشل تحديث الحالة", "error");
    }
  } catch (err: any) {
    showToast(err.message || err.statusMessage || "خطأ في الاتصال", "error");
  } finally {
    saving.value = false;
  }
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

async function savePayments() {
  if (!order.value) {
    showToast("بيانات الطلب غير متاحة، حاول إعادة فتح النافذة", "error");
    return;
  }
  const hasTemp = payments.value.some((p) => p.id < 0);
  if (hasTemp) {
    const invalidPayment = payments.value.find(
      (p) => p.id < 0 && (!p.payment_method_id || !p.payment_method_id[0]),
    );
    if (invalidPayment) {
      showToast(
        "طريقة الدفع غير صالحة، حاول إزالة الدفعة وإضافتها مجدداً",
        "error",
      );
      return;
    }
  }
  saving.value = true;
  try {
    const paymentsPayload = payments.value.map((p) => ({
      id: p.id < 0 ? null : p.id,
      method_id: p.payment_method_id[0],
      amount: editingPayments.value[p.id] ?? p.amount,
    }));
    const res = await $fetch<any>("/api/orders/payments", {
      method: "POST",
      body: { order_id: order.value.id, payments: paymentsPayload },
    });
    if (res.success) {
      showToast("تم تحديث المدفوعات بنجاح", "success");
      for (const p of payments.value) {
        p.amount = editingPayments.value[p.id] ?? p.amount;
      }
      emit("refresh");
      if (order.value) await fetchDetail(order.value.id);
    } else {
      showToast(res.message || "فشل تحديث المدفوعات", "error");
    }
  } catch (err: any) {
    showToast(err.message || err.statusMessage || "خطأ في الاتصال", "error");
  } finally {
    saving.value = false;
  }
}

async function removeLine(lineId: number) {
  if (!order.value) return;
  if (!confirm("هل أنت متأكد من حذف هذا الصنف من الطلب؟")) return;
  saving.value = true;
  try {
    const res = await $fetch<any>("/api/orders/remove-item", {
      method: "POST",
      body: { order_id: order.value.id, line_id: lineId },
    });
    if (res.success) {
      showToast("تم حذف الصنف بنجاح", "success");
      lines.value = lines.value.filter((l) => l.id !== lineId);
      emit("refresh");
      if (order.value) fetchDetail(order.value.id);
    } else {
      showToast(res.message || "فشل حذف الصنف", "error");
    }
  } catch (err: any) {
    showToast(err.message || err.statusMessage || "خطأ في الاتصال", "error");
  } finally {
    saving.value = false;
  }
}

function handlePrintReceipt() {
  if (!order.value) return;
  printReceipt({
    orderName: order.value.name,
    lastOrderItems: lines.value.map((l) => ({
      product: { name: l.product_id?.[1] || `#${l.product_id?.[0] || ""}` },
      quantity: l.qty,
      price: l.price_unit,
      discount: l.discount,
    })),
    lastOrderPayments: payments.value.map((p) => ({
      methodName: p.payment_method_id?.[1] || `#${p.payment_method_id?.[0] || ""}`,
      amount: p.amount,
    })),
    lastOrderSubtotal: totalFromLines.value,
    lastOrderDiscount: lines.value.reduce(
      (sum, l) => sum + ((l.price_unit * l.qty * l.discount) / 100),
      0,
    ),
    lastOrderServiceFee: 0,
    lastOrderGrandTotal: order.value.amount_total,
  });
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
      },
    });
    if (res.success) {
      showToast("تم تحديث الطلب بنجاح", "success");
      editMode.value = false;
      emit("refresh");
      await fetchDetail(order.value.id);
    } else {
      showToast(res.message || "فشل تحديث الطلب", "error");
    }
  } catch (err: any) {
    showToast(err.message || err.statusMessage || "فشل تحديث الطلب", "error");
  } finally {
    saving.value = false;
  }
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
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
            {{ editMode ? "تعديل الطلب" : "تفاصيل الطلب" }}
          </h4>
          <p v-if="order" class="text-label-md text-on-white-variant mt-0.5">
            {{ order.name }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="!editMode && order?.state !== 'cancelled' && order?.state !== 'refund' && can('order.editPayment')"
            @click="enterEditMode"
            class="p-2 rounded-full hover:bg-white-highest transition-colors cursor-pointer text-primary"
            title="تعديل الطلب"
          >
            <Edit3 class="w-5 h-5" />
          </button>
          <button
            @click="closeDrawer"
            class="p-2 rounded-full hover:bg-white-highest transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
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
        <!-- Status Change -->
        <div class="flex items-center gap-4 flex-wrap">
          <div class="flex-1 min-w-0">
            <label class="block text-xs font-bold text-on-white-variant mb-1.5">
              حالة الطلب
            </label>
            <div class="flex gap-2">
              <select
                v-model="selectedStatus"
                :disabled="editMode"
                class="flex-1 h-11 px-3 bg-white border border-outline-variant rounded-lg text-body-md outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option
                  v-for="(label, key) in statusLabels"
                  :key="key"
                  :value="key"
                >
                  {{ label }}
                </option>
              </select>
              <button
                v-if="selectedStatus !== order.state && can('order.void') && !editMode"
                @click="changeStatus"
                :disabled="saving"
                class="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/95 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Save class="w-4 h-4" />
                حفظ
              </button>
            </div>
          </div>
          <div
            class="px-4 py-2 rounded-full text-label-md font-bold self-end"
            :class="
              statusColors[order.state] || 'bg-white-low text-on-white-variant'
            "
          >
            {{ statusLabels[order.state] || order.state }}
          </div>
        </div>

        <!-- Order Info -->
        <div class="bg-white-low p-4 rounded-xl grid grid-cols-2 gap-4">
          <div>
            <p class="text-[10px] text-on-white-variant font-bold mb-0.5">
              رقم الطلب
            </p>
            <p class="text-body-md font-bold font-mono">{{ order.name }}</p>
          </div>
          <div>
            <p class="text-[10px] text-on-white-variant font-bold mb-0.5">
              التاريخ
            </p>
            <p class="text-body-md">{{ formatDate(order.date_order) }}</p>
          </div>
          <div>
            <p class="text-[10px] text-on-white-variant font-bold mb-0.5">
              العميل
            </p>
            <p class="text-body-md font-bold">
              {{ editingCustomerName || (order.partner_id ? order.partner_id[1] : "عميل نقدي") }}
            </p>
          </div>
          <div>
            <p class="text-[10px] text-on-white-variant font-bold mb-0.5">
              الكاشير
            </p>
            <p class="text-body-md">
              {{ order.user_id ? order.user_id[1] : "—" }}
            </p>
          </div>
        </div>

        <!-- ========== VIEW MODE: Order Lines ========== -->
        <template v-if="!editMode">
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
                    <th class="px-3 py-2 text-[11px] font-bold">المنتج</th>
                    <th class="px-3 py-2 text-[11px] font-bold">الكمية</th>
                    <th class="px-3 py-2 text-[11px] font-bold">السعر</th>
                    <th class="px-3 py-2 text-[11px] font-bold">الخصم</th>
                    <th class="px-3 py-2 text-[11px] font-bold">الإجمالي</th>
                    <th class="px-3 py-2 text-[11px] font-bold"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-variant/40">
                  <tr
                    v-for="line in lines"
                    :key="line.id"
                    class="hover:bg-white-low/50"
                  >
                    <td class="px-3 py-3 text-body-md font-bold text-on-white">
                      {{ line.product_id ? line.product_id[1] : `#${line.product_id?.[0] || ""}` }}
                    </td>
                    <td class="px-3 py-3 text-body-md">{{ line.qty }}</td>
                    <td class="px-3 py-3 text-body-md">
                      {{ Number(line.price_unit).toFixed(2) }}
                    </td>
                    <td class="px-3 py-3 text-body-md">
                      {{ line.discount ? `${line.discount}%` : "—" }}
                    </td>
                    <td class="px-3 py-3 text-body-md font-bold text-primary">
                      {{ Number(line.price_subtotal).toFixed(2) }}
                    </td>
                    <td class="px-3 py-3">
                      <button
                        v-if="can('order.removeLine')"
                        @click="removeLine(line.id)"
                        :disabled="saving"
                        class="p-1.5 rounded-lg hover:bg-error/10 text-error/70 hover:text-error transition-colors cursor-pointer disabled:opacity-30"
                        title="حذف الصنف"
                      >
                        <Trash2 class="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  <tr v-if="lines.length === 0">
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
          </div>
        </template>

        <!-- ========== EDIT MODE: Order Lines ========== -->
        <template v-if="editMode">
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
                    <th class="px-2 py-2 text-[11px] font-bold">% الخصم</th>
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
                    <td class="px-2 py-2 text-body-md font-bold text-on-white whitespace-nowrap">
                      <div class="flex items-center gap-1.5">
                        <span v-if="line._isNew" class="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                        <span>{{ line.product_id[1] }}</span>
                      </div>
                    </td>
                    <td class="px-2 py-2">
                      <div class="flex items-center gap-1" v-if="!line._deleted">
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
                    <td class="px-2 py-2">
                      <div v-if="!line._deleted" class="relative inline-block">
                        <input
                          v-model.number="line.discount"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          class="w-16 h-7 px-1.5 pl-5 bg-white border border-outline-variant rounded-md text-body-md outline-none focus:border-primary tabular-nums"
                        />
                        <span class="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-on-white-variant">%</span>
                      </div>
                    </td>
                    <td class="px-2 py-2 text-body-md font-bold text-primary tabular-nums">
                      {{ (line.price_unit * line.qty * (1 - line.discount / 100)).toFixed(2) }}
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
                <span class="text-xs text-on-white-variant">{{ showProductSearch ? "إخفاء" : "إضافة" }}</span>
              </button>
              <div v-if="showProductSearch" class="bg-white-low border border-outline-variant rounded-xl p-3 space-y-2">
                <div class="relative">
                  <Search class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-white-variant" />
                  <input
                    v-model="productSearchQuery"
                    @input="handleProductSearch(productSearchQuery)"
                    type="text"
                    placeholder="ابحث عن منتج بالاسم أو الباركود..."
                    class="w-full h-10 pr-10 bg-white border border-outline-variant rounded-lg px-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div v-if="productSearchLoading" class="text-center text-xs text-on-white-variant py-3">
                  جاري البحث...
                </div>
                <div v-else-if="productSearchResults.length > 0" class="max-h-48 overflow-y-auto space-y-1">
                  <button
                    v-for="prod in productSearchResults"
                    :key="prod.id"
                    @click="addProductToOrder(prod)"
                    class="w-full text-right px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/5 text-on-white transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>{{ prod.name }}</span>
                    <span class="text-xs text-on-white-variant tabular-nums">{{ prod.list_price.toFixed(2) }} ج.م</span>
                  </button>
                </div>
                <div v-else-if="productSearchQuery && !productSearchLoading" class="text-center text-xs text-on-white-variant py-3">
                  لا توجد نتائج
                </div>
              </div>
            </div>
          </div>

          <!-- Edit Mode: Order Adjustments -->
          <div class="space-y-3">
            <h5
              class="text-label-md font-bold text-primary border-r-4 border-primary pr-3 mb-3"
            >
              تعديلات الطلب
            </h5>

            <!-- Discount Editor -->
            <div class="bg-white border border-outline-variant rounded-xl overflow-hidden">
              <button
                @click="showDiscountEditor = !showDiscountEditor"
                class="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-on-white hover:bg-white-low transition-colors cursor-pointer"
              >
                <div class="flex items-center gap-2">
                  <Percent class="w-4 h-4 text-error" />
                  <span>خصم على الفاتورة</span>
                </div>
                <div class="flex items-center gap-2">
                  <span v-if="orderDiscount > 0" class="text-xs text-error font-bold">
                    {{ orderDiscountType === 'percent' ? `${orderDiscount}%` : `${orderDiscount} ج.م` }}
                  </span>
                  <span class="text-xs text-on-white-variant">{{ showDiscountEditor ? "إخفاء" : "تعديل" }}</span>
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
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-on-white-variant">
                    {{ orderDiscountType === "fixed" ? "ج.م" : "%" }}
                  </span>
                </div>
                <div v-if="editDiscountAmount > 0" class="text-left text-xs text-error font-bold">
                  قيمة الخصم: {{ editDiscountAmount.toFixed(2) }} ج.م
                </div>
              </div>
            </div>

            <!-- Service Fee Editor -->
            <div class="bg-white border border-outline-variant rounded-xl overflow-hidden">
              <button
                @click="showServiceFeeEditor = !showServiceFeeEditor"
                class="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-on-white hover:bg-white-low transition-colors cursor-pointer"
              >
                <div class="flex items-center gap-2">
                  <Plus class="w-4 h-4 text-amber-500" />
                  <span>رسوم إضافية</span>
                </div>
                <div class="flex items-center gap-2">
                  <span v-if="serviceFee > 0" class="text-xs text-amber-600 font-bold">
                    {{ serviceFeeType === 'percent' ? `${serviceFee}%` : `${serviceFee} ج.م` }}
                  </span>
                  <span class="text-xs text-on-white-variant">{{ showServiceFeeEditor ? "إخفاء" : "تعديل" }}</span>
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
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-on-white-variant">
                    {{ serviceFeeType === "fixed" ? "ج.م" : "%" }}
                  </span>
                </div>
                <div v-if="editServiceFeeAmount > 0" class="text-left text-xs text-amber-600 font-bold">
                  قيمة الرسوم: {{ editServiceFeeAmount.toFixed(2) }} ج.م
                </div>
              </div>
            </div>

            <!-- Customer Editor -->
            <div class="bg-white border border-outline-variant rounded-xl overflow-hidden">
              <button
                @click="showCustomerEditor = !showCustomerEditor"
                class="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-on-white hover:bg-white-low transition-colors cursor-pointer"
              >
                <div class="flex items-center gap-2">
                  <User class="w-4 h-4 text-purple-500" />
                  <span>العميل</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-purple-600 font-medium">{{ editingCustomerName || "عميل نقدي" }}</span>
                  <span class="text-xs text-on-white-variant">{{ showCustomerEditor ? "إخفاء" : "تعديل" }}</span>
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
                    @click="editingCustomerName = ''; editingCustomerId = null"
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
            <div class="bg-white border border-outline-variant rounded-xl overflow-hidden">
              <button
                @click="showNoteEditor = !showNoteEditor"
                class="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-on-white hover:bg-white-low transition-colors cursor-pointer"
              >
                <div class="flex items-center gap-2">
                  <MessageSquareText class="w-4 h-4 text-blue-500" />
                  <span>ملاحظات</span>
                </div>
                <span class="text-xs text-on-white-variant">{{ showNoteEditor ? "إخفاء" : "تعديل" }}</span>
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
          </div>
        </template>

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

            <button
              v-if="payments.length > 0 && can('order.editPayment')"
              @click="savePayments"
              :disabled="saving"
              class="w-full px-5 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/95 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-sm"
            >
              <Save class="w-4 h-4" />
              حفظ المدفوعات
            </button>
          </div>
        </div>

        <!-- Totals Summary -->
        <div
          class="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2"
        >
          <div class="flex justify-between text-body-md">
            <span class="text-on-white-variant">المجموع الفرعي</span>
            <span class="font-bold tabular-nums">
              {{ editMode ? editSubtotal.toFixed(2) : totalFromLines.toFixed(2) }} ج.م
            </span>
          </div>
          <div v-if="editMode && editDiscountAmount > 0" class="flex justify-between text-body-md text-error">
            <span>الخصم</span>
            <span class="font-bold tabular-nums">-{{ editDiscountAmount.toFixed(2) }} ج.م</span>
          </div>
          <div v-if="editMode && editServiceFeeAmount > 0" class="flex justify-between text-body-md text-amber-600">
            <span>رسوم إضافية</span>
            <span class="font-bold tabular-nums">+{{ editServiceFeeAmount.toFixed(2) }} ج.م</span>
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
              {{ editMode ? editGrandTotal.toFixed(2) : Number(order.amount_total).toFixed(2) }} ج.م
            </span>
          </div>
          <div class="flex justify-between text-body-md">
            <span class="text-on-white-variant">المدفوع</span>
            <span class="font-bold text-success tabular-nums"
              >{{ Number(order.amount_paid).toFixed(2) }} ج.م</span
            >
          </div>
          <div
            v-if="editMode && hasChanges"
            class="text-[10px] text-amber-600 font-medium text-left mt-1"
          >
            * يتم إعادة حساب الضريبة والإجمالي بعد الحفظ من الخادم
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 bg-white-high border-t border-outline-variant shrink-0 space-y-3">
        <template v-if="editMode">
          <div class="flex gap-3">
            <button
              @click="cancelEdit"
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
        </template>
        <template v-else>
          <button
            v-if="lines.length > 0 && order?.state !== 'cancelled'"
            @click="handlePrintReceipt"
            class="w-full py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/95 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            <Printer class="w-4 h-4" />
            طباعة الفاتورة
          </button>
          <button
            @click="closeDrawer"
            class="w-full py-3 rounded-xl border border-outline font-bold text-on-white hover:bg-white transition-all cursor-pointer active:scale-95 text-center"
          >
            إغلاق
          </button>
        </template>
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

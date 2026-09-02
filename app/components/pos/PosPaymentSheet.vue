<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import {
  X,
  RefreshCw,
  AlertTriangle,
  Receipt,
  Banknote,
  User,
  CreditCard,
  Landmark,
} from "@lucide/vue";
import { usePosCartStore } from "~~/stores/pos-cart";
import type { PaymentMethod, OrderResponse } from "~/types/pos";
import { useReceiptPrint } from "~/composables/useReceiptPrint";
import { useNumberFormat } from "~/composables/useNumberFormat";

const { receiptConfig, fetchReceiptConfig, printReceipt } = useReceiptPrint();

const { formatNumber } = useNumberFormat();

const props = defineProps<{
  open: boolean;
  paymentMethods: PaymentMethod[];
  sessionId: number;
  configId: string;
}>();

const emit = defineEmits<{
  "update:open": [val: boolean];
  "order-completed": [];
}>();

const cart = usePosCartStore();

const isSaving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const orderName = ref("");

const lastOrderItems = ref<
  {
    product: { name: string };
    quantity: number;
    price: number;
    discount: number;
  }[]
>([]);
const lastOrderPayments = ref<{ methodName: string; amount: number }[]>([]);
const lastOrderSubtotal = ref(0);
const lastOrderDiscount = ref(0);
const lastOrderServiceFee = ref(0);
const lastOrderDeliveryCost = ref(0);
const lastOrderDriverName = ref("");
const lastOrderGrandTotal = ref(0);
const lastOrderCustomerName = ref("");
const lastOrderCustomerPhone = ref("");
const lastOrderCustomerAddress = ref("");

const allocations = ref<
  { methodId: number; methodName: string; amount: number }[]
>([]);
const activeMethodId = ref<number | null>(null);
const calculatorValue = ref("");
const showCalculator = ref(false);

const filteredMethods = computed(() => {
  const names = ["نقدي", "حساب العميل", "بطاقة", "تحويل بنكي"];
  const normalize = (s: string) =>
    s.replace(/ة/g, "ه").replace(/[أإآ]/g, "ا").trim();
  return names
    .map((name) =>
      props.paymentMethods.find((m) => normalize(m.name) === normalize(name)),
    )
    .filter(Boolean) as PaymentMethod[];
});

const totalPaid = computed(() =>
  allocations.value.reduce((s, a) => s + a.amount, 0),
);

const balance = computed(() => cart.grandTotal - totalPaid.value);

const balanceInfo = computed(() => {
  if (allocations.value.length === 0) return null;
  if (balance.value > 0.01) {
    return {
      text: `المطلوب من العميل: ${formatNumber(balance.value)} ج.م`,
      class: "bg-red-50 text-red-600",
    };
  }
  if (balance.value < -0.01) {
    return {
      text: `المتبقي للعميل: ${formatNumber(Math.abs(balance.value))} ج.م`,
      class: "bg-emerald-50 text-emerald-600",
    };
  }
  return {
    text: "المبلغ كامل",
    class: "bg-emerald-50 text-emerald-600",
  };
});

const isFullyPaid = computed(
  () =>
    totalPaid.value >= cart.grandTotal - 0.01 &&
    allocations.value.length > 0,
);

const methodIcons: Record<string, any> = {
  نقدي: Banknote,
  "حساب العميل": User,
  بطاقه: CreditCard,
  "تحويل بنكي": Landmark,
};

function getMethodIcon(method: PaymentMethod) {
  return methodIcons[method.name] || CreditCard;
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    fetchReceiptConfig();
    allocations.value = [];
    activeMethodId.value = null;
    showCalculator.value = false;
    calculatorValue.value = "";
    errorMessage.value = "";
    successMessage.value = "";
  },
);

function closeModal() {
  if (isSaving.value) return;
  errorMessage.value = "";
  successMessage.value = "";
  orderName.value = "";
  emit("update:open", false);
}

function selectMethod(methodId: number) {
  if (activeMethodId.value === methodId) {
    showCalculator.value = false;
    activeMethodId.value = null;
    return;
  }
  activeMethodId.value = methodId;
  const existing = allocations.value.find((a) => a.methodId === methodId);
  calculatorValue.value = existing ? String(existing.amount) : "";
  showCalculator.value = true;
}

function editAllocation(methodId: number) {
  selectMethod(methodId);
}

function removeAllocation(methodId: number) {
  allocations.value = allocations.value.filter((a) => a.methodId !== methodId);
  if (activeMethodId.value === methodId) {
    showCalculator.value = false;
    activeMethodId.value = null;
  }
}

function pressDigit(d: string) {
  const cur = calculatorValue.value;
  if (cur === "0") {
    calculatorValue.value = d;
  } else {
    calculatorValue.value += d;
  }
}

function pressDecimal() {
  if (!calculatorValue.value.includes(".")) {
    calculatorValue.value += ".";
  }
}

function pressBackspace() {
  calculatorValue.value = calculatorValue.value.slice(0, -1) || "0";
}

function pressClear() {
  calculatorValue.value = "0";
}

function confirmAmount() {
  if (!activeMethodId.value) return;
  const amount = Math.max(0, parseFloat(calculatorValue.value) || 0);
  const method = filteredMethods.value.find(
    (m) => m.id === activeMethodId.value,
  );
  if (!method) return;

  const existing = allocations.value.find(
    (a) => a.methodId === activeMethodId.value,
  );
  if (existing) {
    existing.amount = amount;
  } else {
    allocations.value.push({
      methodId: method.id,
      methodName: method.name,
      amount,
    });
  }
  showCalculator.value = false;
  activeMethodId.value = null;
}

function handleCalcPress(key: string) {
  switch (key) {
    case "⌫":
      pressBackspace();
      break;
    case "C":
      pressClear();
      break;
    case "تأكيد":
      confirmAmount();
      break;
    case ".":
      pressDecimal();
      break;
    default:
      pressDigit(key);
      break;
  }
}

async function handleSubmit() {
  errorMessage.value = "";
  successMessage.value = "";

  if (!cart.selectedLocationId) {
    errorMessage.value = "يجب تحديد موقع التخزين قبل إتمام الطلب";
    return;
  }

  if (!isFullyPaid.value) {
    errorMessage.value = "يجب تغطية كامل المبلغ قبل تأكيد الدفع";
    return;
  }

  if (!props.sessionId) {
    errorMessage.value = "رقم الجلسة غير متاح، يرجى فتح وردية أولاً";
    return;
  }

  isSaving.value = true;

  const validPayments = allocations.value
    .filter((a) => a.amount > 0)
    .map((a) => ({
      method_id: a.methodId,
      method_name: a.methodName,
      amount: a.amount,
    }));

  const totalPaidVal = validPayments.reduce((s, p) => s + p.amount, 0);
  if (totalPaidVal < cart.grandTotal - 0.01) {
    errorMessage.value = "مبلغ الدفع أقل من الإجمالي";
    isSaving.value = false;
    return;
  }

  // if overpaid, cap last payment to match grandTotal exactly
  let cappedPayments = validPayments;
  if (totalPaidVal > cart.grandTotal + 0.01) {
    const diff = totalPaidVal - cart.grandTotal;
    cappedPayments = [...validPayments];
    const last = cappedPayments[cappedPayments.length - 1];
    last.amount = Math.max(0, +(last.amount - diff).toFixed(2));
  }

  try {
    const res = await $fetch<OrderResponse>("/api/pos/order", {
      method: "POST",
      body: {
        session_id: props.sessionId,
        items: cart.items.map((item) => ({
          product_id: item.variant?.id || item.product.id,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount || 0,
          taxes_id: item.product.taxes?.map((t) => t.id) || [],
        })),
        payments: cappedPayments,
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
      successMessage.value = res.message;
      orderName.value = res.name;
      lastOrderItems.value = cart.items.map((item) => ({
        product: {
          name: item.variant
            ? `${item.product.display_name || item.product.name} (${item.variant.attribute_values?.map((v) => v.value_name).join("/") || item.variant.display_name})`
            : item.product.display_name || item.product.name,
        },
        quantity: item.quantity,
        price: item.price,
        discount: item.discount || 0,
      }));
      lastOrderPayments.value = cappedPayments.map((p) => ({
        methodName: p.method_name,
        amount: p.amount,
      }));
      lastOrderSubtotal.value = cart.subtotal;
      lastOrderDiscount.value = cart.discountAmount;
      lastOrderServiceFee.value = cart.serviceFeeAmount;
      lastOrderDeliveryCost.value = cart.deliveryCost;
      lastOrderDriverName.value = cart.deliveryDriverName;
      lastOrderGrandTotal.value = cart.grandTotal;
      lastOrderCustomerName.value = cart.customerName;
      lastOrderCustomerPhone.value = cart.customerPhone;
      lastOrderCustomerAddress.value = cart.customerAddress;
      cart.clearCart();
      closeCompleted();
      printReceipt({
        orderName: orderName.value,
        lastOrderItems: lastOrderItems.value,
        lastOrderPayments: lastOrderPayments.value,
        lastOrderSubtotal: lastOrderSubtotal.value,
        lastOrderDiscount: lastOrderDiscount.value,
        lastOrderServiceFee: lastOrderServiceFee.value,
        lastOrderDeliveryCost: lastOrderDeliveryCost.value,
        lastOrderDriverName: lastOrderDriverName.value,
        lastOrderGrandTotal: lastOrderGrandTotal.value,
        lastOrderCustomerName: lastOrderCustomerName.value,
        lastOrderCustomerPhone: lastOrderCustomerPhone.value,
        lastOrderCustomerAddress: lastOrderCustomerAddress.value,
      });
    }
  } catch (error: any) {
    errorMessage.value = error.statusMessage || "فشل إنشاء الطلب";
  } finally {
    isSaving.value = false;
  }
}

function closeCompleted() {
  successMessage.value = "";
  orderName.value = "";
  emit("order-completed");
  emit("update:open", false);
}

async function handlePrintReceipt() {
  await printReceipt({
    orderName: orderName.value,
    lastOrderItems: lastOrderItems.value,
    lastOrderPayments: lastOrderPayments.value,
    lastOrderSubtotal: lastOrderSubtotal.value,
    lastOrderDiscount: lastOrderDiscount.value,
    lastOrderServiceFee: lastOrderServiceFee.value,
    lastOrderDeliveryCost: lastOrderDeliveryCost.value,
    lastOrderDriverName: lastOrderDriverName.value,
    lastOrderGrandTotal: lastOrderGrandTotal.value,
  });
}
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
      <!-- Header -->
      <div
        class="p-6 pb-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0"
      >
        <div class="flex items-center gap-3">
          <div class="bg-primary/10 p-2 rounded-lg">
            <Receipt class="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900">إتمام الطلب</h3>
            <p class="text-xs text-slate-500">
              {{ cart.itemCount }} منتج - الإجمالي
              {{ formatNumber(cart.grandTotal) }}
              ج.م
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
        class="flex-1 overflow-y-auto p-6 space-y-5 text-right max-w-7xl mx-auto w-full"
      >
        <!-- Error -->
        <div
          v-if="errorMessage"
          class="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold flex items-center gap-2"
        >
          <AlertTriangle class="w-4 h-4 shrink-0" />
          {{ errorMessage }}
        </div>

        <template v-if="!successMessage">
          <!-- Order Summary -->
          <PosPaymentOrderSummary
            :subtotal="cart.subtotal"
            :discount-amount="cart.discountAmount"
            :service-fee-amount="cart.serviceFeeAmount"
            :delivery-cost-amount="cart.deliveryCost"
            :delivery-driver-name="cart.deliveryDriverName"
            :grand-total="cart.grandTotal"
          />

          <!-- Service Fee -->
          <PosPaymentServiceFee />

          <!-- Payment Methods -->
          <div class="space-y-4">
            <h4 class="text-sm font-bold text-slate-700">طرق الدفع</h4>

            <!-- 4 method buttons -->
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="method in filteredMethods"
                :key="method.id"
                @click="selectMethod(method.id)"
                :class="[
                  'flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all cursor-pointer',
                  activeMethodId === method.id
                    ? 'border-primary bg-primary/5'
                    : allocations.some((a) => a.methodId === method.id)
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50',
                ]"
              >
                <component
                  :is="getMethodIcon(method)"
                  class="w-7 h-7"
                  :class="
                    allocations.some((a) => a.methodId === method.id)
                      ? 'text-emerald-600'
                      : 'text-slate-600'
                  "
                />
                <span
                  class="text-sm font-bold"
                  :class="
                    allocations.some((a) => a.methodId === method.id)
                      ? 'text-emerald-700'
                      : 'text-slate-700'
                  "
                  >{{ method.name }}</span
                >
              </button>
            </div>

            <!-- Calculator -->
            <div
              v-if="showCalculator"
              class="bg-slate-50 rounded-2xl p-4 space-y-3"
            >
              <div
                class="text-left text-3xl font-bold tabular-nums text-slate-900 bg-white rounded-xl px-4 py-3 border border-slate-200"
                dir="ltr"
              >
                {{ calculatorValue || "0" }}
              </div>
              <div class="grid grid-cols-4 gap-2">
                <button
                  v-for="key in ['7', '8', '9', '⌫']"
                  :key="key"
                  @click="handleCalcPress(key)"
                  class="h-13 rounded-xl font-bold text-base cursor-pointer transition-colors bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 active:scale-95"
                  :class="key === '⌫' ? 'text-amber-600' : ''"
                >
                  {{ key }}
                </button>
                <button
                  v-for="key in ['4', '5', '6', 'C']"
                  :key="key"
                  @click="handleCalcPress(key)"
                  class="h-13 rounded-xl font-bold text-base cursor-pointer transition-colors bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 active:scale-95"
                  :class="key === 'C' ? 'text-red-500' : ''"
                >
                  {{ key }}
                </button>
                <button
                  v-for="key in ['1', '2', '3', 'تأكيد']"
                  :key="key"
                  @click="handleCalcPress(key)"
                  class="h-13 rounded-xl font-bold text-base cursor-pointer transition-colors active:scale-95"
                  :class="
                    key === 'تأكيد'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'
                  "
                >
                  {{ key }}
                </button>
                <button
                  @click="handleCalcPress('0')"
                  class="h-13 rounded-xl font-bold text-base cursor-pointer bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 active:scale-95"
                >
                  0
                </button>
                <button
                  @click="handleCalcPress('00')"
                  class="h-13 rounded-xl font-bold text-base cursor-pointer bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 active:scale-95"
                >
                  00
                </button>
                <button
                  @click="handleCalcPress('.')"
                  class="h-13 rounded-xl font-bold text-base cursor-pointer bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 active:scale-95"
                >
                  .
                </button>
                <div />
              </div>
            </div>

            <!-- Allocations list -->
            <div v-if="allocations.length > 0" class="space-y-2">
              <div
                v-for="alloc in allocations"
                :key="alloc.methodId"
                class="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl"
              >
                <div class="flex items-center gap-2">
                  <button
                    @click="removeAllocation(alloc.methodId)"
                    class="text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                    title="إزالة"
                  >
                    <X class="w-4 h-4" />
                  </button>
                  <button
                    @click="editAllocation(alloc.methodId)"
                    class="text-xs text-blue-500 hover:text-blue-700 transition-colors font-bold cursor-pointer"
                  >
                    تعديل
                  </button>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-bold tabular-nums text-slate-900">
                    {{ formatNumber(alloc.amount) }} ج.م
                  </span>
                  <component
                    :is="
                      getMethodIcon(
                        filteredMethods.find((m) => m.id === alloc.methodId)!,
                      )
                    "
                    class="w-4 h-4 text-slate-500"
                  />
                  <span class="text-sm text-slate-600">{{
                    alloc.methodName
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Balance -->
            <div
              v-if="balanceInfo"
              class="text-center font-bold p-3 rounded-xl text-sm"
              :class="balanceInfo.class"
            >
              {{ balanceInfo.text }}
            </div>
          </div>
        </template>
      </div>

      <!-- Footer -->
      <div
        class="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0"
      >
        <div v-if="!successMessage" class="text-xs text-slate-400">
          {{ allocations.length }} وسيلة دفع
        </div>
        <div v-else />

        <div class="flex items-center gap-3">
          <template>
            <button
              type="button"
              @click="closeModal"
              class="h-11 px-5 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              @click="handleSubmit"
              :disabled="isSaving || !isFullyPaid"
              class="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              <RefreshCw v-if="isSaving" class="w-4 h-4 animate-spin" />
              <span>{{ isSaving ? "جاري..." : "تأكيد الدفع" }}</span>
            </button>
          </template>
        </div>
      </div>
    </div>
  </Transition>
</template>

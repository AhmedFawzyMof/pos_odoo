<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  X,
  RefreshCw,
  AlertTriangle,
  Receipt,
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
  preselectMethodId?: number | null;
  autoExpandSection?: "discount" | "customer" | null;
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

const orderNote = ref(cart.note);

const localPaymentAllocations = ref<
  { methodId: number; amount: number; received?: number }[]
>([]);

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
const lastOrderGrandTotal = ref(0);

const isFullyPaid = computed(
  () => {
    // If grandTotal is 0 or negative (100% discount), no payment needed
    if (cart.grandTotal <= 0) return true;
    // Otherwise require payments >= grandTotal and at least one payment
    return (
      localPaymentAllocations.value.reduce((s, p) => s + p.amount, 0) >=
        cart.grandTotal &&
      localPaymentAllocations.value.length > 0
    );
  },
);

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    fetchReceiptConfig();
    orderNote.value = cart.note;
    localPaymentAllocations.value = [];
    if (props.preselectMethodId) {
      const method = props.paymentMethods.find(
        (m) => m.id === props.preselectMethodId,
      );
      if (method) {
        localPaymentAllocations.value.push({
          methodId: method.id,
          amount: Math.max(0, cart.grandTotal),
        });
      }
    }
  },
);

function closeModal() {
  if (isSaving.value) return;
  errorMessage.value = "";
  successMessage.value = "";
  orderName.value = "";
  emit("update:open", false);
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

  // Check that all payment allocations have valid amounts (> 0) only if grandTotal > 0
  if (cart.grandTotal > 0) {
    const hasZeroAmountPayment = localPaymentAllocations.value.some((p) => p.amount <= 0);
    if (hasZeroAmountPayment) {
      errorMessage.value = "جميع طرق الدفع يجب أن يكون لها مبلغ أكبر من صفر";
      return;
    }
  }

  if (!props.sessionId) {
    errorMessage.value = "رقم الجلسة غير متاح، يرجى فتح وردية أولاً";
    return;
  }

  isSaving.value = true;

  // Filter out any 0-amount payments and validate total
  const validPayments = localPaymentAllocations.value
    .filter((p) => p.amount > 0)
    .map((p) => {
      const method = props.paymentMethods.find((m) => m.id === p.methodId);
      return {
        method_id: p.methodId,
        method_name: method?.name || "",
        amount: p.amount,
      };
    });

  const totalPaid = validPayments.reduce((s, p) => s + p.amount, 0);
  if (totalPaid < cart.grandTotal - 0.01) {
    errorMessage.value = "مبلغ الدفع أقل من الإجمالي";
    isSaving.value = false;
    return;
  }

  const payments = validPayments;

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
        payments,
        note: orderNote.value,
        order_discount: cart.orderDiscount,
        order_discount_type: cart.orderDiscountType,
        service_fee: cart.serviceFee,
        service_fee_type: cart.serviceFeeType,
        customer_id: cart.customerId,
        location_id: cart.selectedLocationId,
        amount_tax: cart.totalTax,
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
      lastOrderPayments.value = payments.map((p) => ({
        methodName: p.method_name,
        amount: p.amount,
      }));
      lastOrderSubtotal.value = cart.subtotal;
      lastOrderDiscount.value = cart.discountAmount;
      lastOrderServiceFee.value = cart.serviceFeeAmount;
      lastOrderGrandTotal.value = cart.grandTotal;
      cart.clearCart();
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

        <div class="flex-1 overflow-y-auto p-6 space-y-5 text-right max-w-7xl mx-auto w-full">
          <!-- Error -->
          <div
            v-if="errorMessage"
            class="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold flex items-center gap-2"
          >
            <AlertTriangle class="w-4 h-4 shrink-0" />
            {{ errorMessage }}
          </div>

          <!-- Success -->
          <PosPaymentSuccess
            v-if="successMessage"
            :order-name="orderName"
            :items="lastOrderItems"
            :payments="lastOrderPayments"
            :subtotal="lastOrderSubtotal"
            :discount-amount="lastOrderDiscount"
            :service-fee-amount="lastOrderServiceFee"
            :grand-total="lastOrderGrandTotal"
            :receipt-config="receiptConfig"
          />

          <!-- Order Summary -->
          <PosPaymentOrderSummary
            v-if="!successMessage"
            :subtotal="cart.subtotal"
            :discount-amount="cart.discountAmount"
            :service-fee-amount="cart.serviceFeeAmount"
            :grand-total="cart.grandTotal"
          />

          <!-- Order Actions -->
          <template v-if="!successMessage">
            <div class="space-y-3">
              <PosPaymentDiscount :auto-expand="autoExpandSection === 'discount'" />
              <PosPaymentServiceFee />
              <PosPaymentCustomer :auto-expand="autoExpandSection === 'customer'" />
              <PosPaymentNote v-model:note="orderNote" />
            </div>

            <!-- Payment Methods -->
            <PosPaymentMethods
              v-model:allocations="localPaymentAllocations"
              :payment-methods="paymentMethods"
              :grand-total="cart.grandTotal"
            />
          </template>
        </div>

        <!-- Footer -->
        <div
          class="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0"
        >
          <div v-if="!successMessage" class="text-xs text-slate-400">
            {{ localPaymentAllocations.length }} وسيلة دفع
          </div>
          <div v-else />

          <div class="flex items-center gap-3">
            <template v-if="!successMessage">
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
            <template v-else>
              <button
                type="button"
                @click="handlePrintReceipt"
                class="h-11 px-5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-bold rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Receipt class="w-4 h-4" />
                طباعة
              </button>
              <button
                type="button"
                @click="closeCompleted"
                class="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all cursor-pointer"
              >
                تم
              </button>
            </template>
          </div>
        </div>
    </div>
  </Transition>
</template>

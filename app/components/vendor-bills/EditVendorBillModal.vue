<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  X,
  LoaderCircle,
  AlertTriangle,
  CheckCircle,
  Landmark,
  Receipt,
  Banknote,
  Send,
  XCircle,
} from "@lucide/vue";
import type { VendorBillDetail } from "~/types/vendorBill";
import { usePermissions } from "~/composables/usePermissions";

const props = defineProps<{
  open: boolean;
  billId: number | null;
}>();

const emit = defineEmits<{
  (e: "update:open", val: boolean): void;
  (e: "saved"): void;
}>();

const { can } = usePermissions();

const isLoading = ref(false);
const loadError = ref("");
const detail = ref<VendorBillDetail | null>(null);
const isPaying = ref(false);
const payError = ref("");
const paySuccess = ref(false);
const updatingStatus = ref(false);
const statusError = ref("");

const fetchDetail = async (id: number) => {
  isLoading.value = true;
  loadError.value = "";
  detail.value = null;
  payError.value = "";
  paySuccess.value = false;
  statusError.value = "";
  try {
    const res = await $fetch<{ success: boolean; data: VendorBillDetail }>(
      "/api/vendor-bills/detail",
      { params: { id } },
    );
    detail.value = res.data;
  } catch (err: any) {
    loadError.value =
      err?.data?.statusMessage || err?.message || "فشل تحميل تفاصيل الفاتورة";
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.billId) fetchDetail(props.billId);
  },
  { immediate: true },
);

watch(
  () => props.billId,
  (id) => {
    if (id && props.open) fetchDetail(id);
  },
);

const canPay = computed(
  () =>
    detail.value?.payment_state !== "paid" &&
    (detail.value?.amount_residual || 0) > 0 &&
    can.value("vendorBill.pay"),
);

const amountPaid = computed(
  () =>
    (detail.value?.amount_total || 0) - (detail.value?.amount_residual || 0),
);

const outsidePayment = async () => {
  if (!detail.value || !canPay.value) return;
  isPaying.value = true;
  payError.value = "";
  paySuccess.value = false;
  try {
    const res = await $fetch<{ success: boolean; message?: string }>(
      "/api/vendor-bills/payment",
      {
        method: "POST",
        body: {
          bill_id: detail.value.id,
          amount: detail.value.amount_residual,
          payment_date: new Date().toISOString().slice(0, 10),
        },
      },
    );
    if (res.success) {
      paySuccess.value = true;
      await fetchDetail(detail.value.id);
      emit("saved");
      setTimeout(() => (paySuccess.value = false), 3000);
    } else {
      payError.value = res.message || "فشل تسجيل الدفعة";
    }
  } catch (err: any) {
    payError.value =
      err?.data?.statusMessage || err?.message || "خطأ في الاتصال بالخادم";
  } finally {
    isPaying.value = false;
  }
};

const postBill = async () => {
  if (!detail.value) return;
  updatingStatus.value = true;
  statusError.value = "";
  try {
    const res = await $fetch<{ success: boolean; message?: string }>(
      "/api/vendor-bills/status",
      { method: "POST", body: { bill_id: detail.value.id, status: "posted" } },
    );
    if (res.success) {
      await fetchDetail(detail.value.id);
      emit("saved");
    } else {
      statusError.value = res.message || "فشل ترحيل الفاتورة";
    }
  } catch (err: any) {
    statusError.value =
      err?.data?.statusMessage || err?.message || "فشل ترحيل الفاتورة";
  } finally {
    updatingStatus.value = false;
  }
};

const cancelBill = async () => {
  if (!detail.value) return;
  updatingStatus.value = true;
  statusError.value = "";
  try {
    const res = await $fetch<{ success: boolean; message?: string }>(
      "/api/vendor-bills/status",
      { method: "POST", body: { bill_id: detail.value.id, status: "cancel" } },
    );
    if (res.success) {
      await fetchDetail(detail.value.id);
      emit("saved");
    } else {
      statusError.value = res.message || "فشل إلغاء الفاتورة";
    }
  } catch (err: any) {
    statusError.value =
      err?.data?.statusMessage || err?.message || "فشل إلغاء الفاتورة";
  } finally {
    updatingStatus.value = false;
  }
};

const closeModal = () => emit("update:open", false);

const stateText = (s: string) =>
  ({ draft: "مسودة", posted: "مرسل", paid: "مدفوع", cancel: "ملغي" })[s] || s;

const paymentStateText = (s: string) =>
  ({
    paid: "مدفوع",
    not_paid: "غير مدفوع",
    partial: "مدفوع جزئياً",
    in_payment: "قيد الدفع",
  })[s] || s;
</script>

<template>
  <Transition name="modal-scale">
    <div
      v-if="props.open"
      class="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-6 border-b border-outline-variant"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary"
          >
            <Receipt class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-headline-sm font-bold text-on-white">
              فاتورة مورد
            </h2>
            <p class="text-label-md text-on-white-variant">
              {{ detail?.name || "تحميل..." }}
            </p>
          </div>
        </div>
        <button
          @click="closeModal"
          class="w-8 h-8 rounded-lg hover:bg-white-low flex items-center justify-center text-on-white-variant cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Body -->
      <div
        class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 max-w-7xl mx-auto w-full"
      >
        <!-- Loading -->
        <div v-if="isLoading" class="flex items-center justify-center py-20">
          <div class="flex flex-col items-center gap-3 text-on-white-variant">
            <LoaderCircle class="w-8 h-8 animate-spin text-primary" />
            <span class="text-[13px]">جاري تحميل تفاصيل الفاتورة...</span>
          </div>
        </div>

        <template v-else-if="detail">
          <!-- Status Messages -->
          <div
            v-if="loadError"
            class="bg-error/10 border border-error text-error p-4 rounded-xl flex items-center gap-3"
          >
            <AlertTriangle class="w-6 h-6 shrink-0" />
            <span class="font-bold">{{ loadError }}</span>
          </div>
          <div
            v-if="statusError"
            class="bg-error/10 border border-error text-error p-4 rounded-xl flex items-center gap-3"
          >
            <AlertTriangle class="w-6 h-6 shrink-0" />
            <span class="font-bold">{{ statusError }}</span>
          </div>
          <div
            v-if="payError"
            class="bg-error/10 border border-error text-error p-4 rounded-xl flex items-center gap-3"
          >
            <AlertTriangle class="w-6 h-6 shrink-0" />
            <span class="font-bold">{{ payError }}</span>
          </div>
          <div
            v-if="paySuccess"
            class="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3"
          >
            <CheckCircle class="w-6 h-6 text-emerald-500" />
            <span class="font-bold">تم تسجيل الدفعة بنجاح</span>
          </div>

          <!-- Section 1: Bill Information -->
          <div
            class="bg-white border border-outline-variant rounded-xl p-6 space-y-4"
          >
            <h3 class="text-headline-sm font-bold flex items-center gap-2">
              <Receipt class="w-5 h-5 text-primary" />
              معلومات الفاتورة
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  class="block text-label-md font-bold text-on-white-variant mb-1"
                >
                  المورد
                </label>
                <p class="text-body-md font-semibold">
                  {{ detail.partner_id ? detail.partner_id[1] : "-" }}
                </p>
              </div>
              <div>
                <label
                  class="block text-label-md font-bold text-on-white-variant mb-1"
                >
                  تاريخ الفاتورة
                </label>
                <p class="text-body-md">{{ detail.invoice_date || "-" }}</p>
              </div>
              <div>
                <label
                  class="block text-label-md font-bold text-on-white-variant mb-1"
                >
                  تاريخ الاستحقاق
                </label>
                <p class="text-body-md">{{ detail.invoice_date_due || "-" }}</p>
              </div>
              <div>
                <label
                  class="block text-label-md font-bold text-on-white-variant mb-1"
                >
                  المرجع
                </label>
                <p class="text-body-md">{{ detail.reference || "-" }}</p>
              </div>
              <div>
                <label
                  class="block text-label-md font-bold text-on-white-variant mb-1"
                >
                  المرجع المورد
                </label>
                <p class="text-body-md">
                  {{ detail.supplier_reference || "-" }}
                </p>
              </div>
              <div>
                <label
                  class="block text-label-md font-bold text-on-white-variant mb-1"
                >
                  الحالة
                </label>
                <div class="flex items-center gap-2">
                  <span
                    class="px-2.5 py-0.5 rounded-full text-xs font-bold"
                    :class="
                      detail.state === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : detail.state === 'posted'
                          ? 'bg-primary/10 text-primary'
                          : detail.state === 'draft'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-red-100 text-red-800'
                    "
                  >
                    {{ stateText(detail.state) }}
                  </span>
                  <span
                    class="px-2.5 py-0.5 rounded-full text-xs font-bold"
                    :class="
                      detail.payment_state === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : detail.payment_state === 'partial' ||
                            detail.payment_state === 'in_payment'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                    "
                  >
                    {{ paymentStateText(detail.payment_state) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Status Action Buttons -->
            <div class="flex gap-2 pt-2 border-t border-outline-variant/45">
              <button
                v-if="detail.state === 'draft' && can('vendorBill.post')"
                @click="postBill"
                :disabled="updatingStatus"
                class="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <LoaderCircle
                  v-if="updatingStatus"
                  class="w-4 h-4 animate-spin"
                />
                <Send v-else class="w-4 h-4" />
                ترحيل
              </button>
              <button
                v-if="
                  detail.state !== 'paid' &&
                  detail.state !== 'cancel' &&
                  can('vendorBill.cancel')
                "
                @click="cancelBill"
                :disabled="updatingStatus"
                class="px-4 py-2 bg-error text-white text-sm font-bold rounded-lg hover:bg-error/90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <LoaderCircle
                  v-if="updatingStatus"
                  class="w-4 h-4 animate-spin"
                />
                <XCircle v-else class="w-4 h-4" />
                إلغاء
              </button>
            </div>
          </div>

          <!-- Section 2: Financial Summary & Outside Payment -->
          <div
            class="bg-white border border-outline-variant rounded-xl p-6 space-y-4"
          >
            <h3 class="text-headline-sm font-bold flex items-center gap-2">
              <Banknote class="w-5 h-5 text-primary" />
              الملخص المالي
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div
                class="bg-primary-container/10 rounded-xl p-4 border border-primary-container/20"
              >
                <label
                  class="block text-label-md font-bold text-on-white-variant mb-1"
                >
                  الإجمالي
                </label>
                <p class="text-price-display font-bold text-primary">
                  {{ detail.amount_total.toLocaleString("en-US") }} ج.م
                </p>
              </div>
              <div
                class="bg-emerald-50 rounded-xl p-4 border border-emerald-200"
              >
                <label
                  class="block text-label-md font-bold text-emerald-600 mb-1"
                >
                  المدفوع
                </label>
                <p class="text-price-display font-bold text-emerald-600">
                  {{ amountPaid.toLocaleString("en-US") }} ج.م
                </p>
              </div>
              <div
                class="bg-amber-50 rounded-xl p-4 border border-amber-200"
                :class="
                  detail.amount_residual > 0
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-emerald-50 border-emerald-200'
                "
              >
                <label
                  class="block text-label-md font-bold mb-1"
                  :class="
                    detail.amount_residual > 0
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  "
                >
                  المتبقي
                </label>
                <p
                  class="text-price-display font-bold"
                  :class="
                    detail.amount_residual > 0
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  "
                >
                  {{ detail.amount_residual.toLocaleString("en-US") }} ج.م
                </p>
              </div>
              <div class="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <label
                  class="block text-label-md font-bold text-slate-600 mb-1"
                >
                  الضريبة
                </label>
                <p class="text-price-display font-bold text-slate-600">
                  {{ detail.amount_tax.toLocaleString("en-US") }} ج.م
                </p>
              </div>
            </div>

            <!-- Outside Payment Button -->
            <div v-if="canPay" class="pt-2">
              <button
                @click="outsidePayment"
                :disabled="isPaying"
                class="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 text-lg"
              >
                <LoaderCircle v-if="isPaying" class="w-5 h-5 animate-spin" />
                <Landmark v-else class="w-5 h-5" />
                {{
                  isPaying
                    ? "جاري تسجيل الدفعة..."
                    : `دفع خارجي - ${detail.amount_residual.toLocaleString("en-US")} ج.م`
                }}
              </button>
              <p class="text-label-md text-on-white-variant mt-1 text-center">
                سيتم تسوية المبلغ المتبقي بالكامل
              </p>
            </div>
          </div>

          <!-- Section 3: Payment History -->
          <div
            class="bg-white border border-outline-variant rounded-xl p-6 space-y-4"
          >
            <h3 class="text-headline-sm font-bold flex items-center gap-2">
              <Landmark class="w-5 h-5 text-primary" />
              سجل الدفعات
            </h3>
            <div
              v-if="detail.payments.length === 0"
              class="text-center py-6 text-on-white-variant"
            >
              <p class="font-bold">لا توجد دفعات مسجلة</p>
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-right border-collapse">
                <thead class="bg-white-low text-on-white-variant">
                  <tr>
                    <th class="p-3 text-label-md font-bold">رقم الدفعة</th>
                    <th class="p-3 text-label-md font-bold">التاريخ</th>
                    <th class="p-3 text-label-md font-bold">المبلغ</th>
                    <th class="p-3 text-label-md font-bold">طريقة الدفع</th>
                    <th class="p-3 text-label-md font-bold">الحالة</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-variant/45">
                  <tr
                    v-for="payment in detail.payments"
                    :key="payment.id"
                    class="hover:bg-primary/5 transition-colors"
                  >
                    <td class="p-3 font-bold">{{ payment.name }}</td>
                    <td class="p-3 text-on-white-variant">
                      {{ payment.date }}
                    </td>
                    <td class="p-3 font-bold">
                      {{ payment.amount.toLocaleString("en-US") }} ج.م
                    </td>
                    <td class="p-3">
                      {{ payment.journal_id ? payment.journal_id[1] : "-" }}
                    </td>
                    <td class="p-3">
                      <span
                        class="px-2 py-0.5 rounded-full text-xs font-bold"
                        :class="
                          payment.state === 'posted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        "
                      >
                        {{
                          payment.state === "posted" ? "مرسل" : payment.state
                        }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Section 4: Invoice Lines -->
          <div
            v-if="detail.lines.length > 0"
            class="bg-white border border-outline-variant rounded-xl p-6 space-y-4"
          >
            <h3 class="text-headline-sm font-bold flex items-center gap-2">
              <Receipt class="w-5 h-5 text-primary" />
              بنود الفاتورة
            </h3>
            <div class="overflow-x-auto">
              <table class="w-full text-right border-collapse">
                <thead class="bg-white-low text-on-white-variant">
                  <tr>
                    <th class="p-3 text-label-md font-bold">المنتج</th>
                    <th class="p-3 text-label-md font-bold">الكمية</th>
                    <th class="p-3 text-label-md font-bold">سعر الوحدة</th>
                    <th class="p-3 text-label-md font-bold">الضريبة</th>
                    <th class="p-3 text-label-md font-bold">الإجمالي</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-variant/45">
                  <tr
                    v-for="line in detail.lines"
                    :key="line.id"
                    class="hover:bg-primary/5 transition-colors"
                  >
                    <td class="p-3 font-bold">
                      {{ line.product_id ? line.product_id[1] : line.name }}
                    </td>
                    <td class="p-3 text-on-white-variant">
                      {{ line.quantity }}
                    </td>
                    <td class="p-3">
                      {{ line.price_unit.toLocaleString("en-US") }} ج.م
                    </td>
                    <td class="p-3 text-on-white-variant">
                      {{ line.tax_ids.map((t) => t.name).join(", ") || "-" }}
                    </td>
                    <td class="p-3 font-bold">
                      {{ line.price_total.toLocaleString("en-US") }} ج.م
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Section 5: Narration -->
          <div
            v-if="detail.narration"
            class="bg-white border border-outline-variant rounded-xl p-6 space-y-2"
          >
            <h3 class="text-headline-sm font-bold flex items-center gap-2">
              ملاحظات
            </h3>
            <p class="text-body-md text-on-white-variant whitespace-pre-wrap">
              {{ detail.narration }}
            </p>
          </div>
        </template>

        <!-- Not found error -->
        <div
          v-else-if="!isLoading && loadError"
          class="bg-error/10 border border-error text-error p-6 rounded-2xl text-center"
        >
          <AlertTriangle class="w-10 h-10 mb-2 inline-block" />
          <p class="font-bold">{{ loadError }}</p>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="flex items-center justify-end gap-3 p-6 border-t border-outline-variant"
      >
        <button
          @click="closeModal"
          class="px-5 py-2.5 border border-outline-variant rounded-lg font-bold hover:bg-white-low cursor-pointer"
        >
          إغلاق
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-scale-enter-active {
  transition: opacity 0.2s ease-out;
}
.modal-scale-leave-active {
  transition: opacity 0.15s ease-in;
}
.modal-scale-enter-from {
  opacity: 0;
}
.modal-scale-leave-to {
  opacity: 0;
}
</style>

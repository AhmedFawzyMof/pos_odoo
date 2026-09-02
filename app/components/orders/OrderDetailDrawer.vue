<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { X, LoaderCircle, AlertCircle, CheckCheck } from "@lucide/vue";
import type { POSOrder, OrderLine, OrderPayment } from "~/types/pos";
import { formatDateWithTime } from "~/lib/dateUtils";

const props = defineProps<{
  isOpen: boolean;
  orderId: number | null;
}>();

const emit = defineEmits<{
  (e: "update:isOpen", value: boolean): void;
}>();

const loading = ref(false);
const error = ref("");
const order = ref<POSOrder | null>(null);
const lines = ref<OrderLine[]>([]);
const payments = ref<OrderPayment[]>([]);

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

watch(
  () => props.isOpen,
  (open) => {
    if (open && props.orderId) {
      fetchDetail(props.orderId);
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
    } else {
      error.value = data.message || "فشل تحميل تفاصيل الطلب";
    }
  } catch (err: any) {
    error.value = err.message || err.statusMessage || "خطأ في الاتصال بالخادم";
  } finally {
    loading.value = false;
  }
}

function closeDrawer() {
  emit("update:isOpen", false);
  order.value = null;
  lines.value = [];
  payments.value = [];
  error.value = "";
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  return formatDateWithTime(dateStr);
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
            تفاصيل الطلب
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
        <!-- Status -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[10px] text-on-white-variant font-bold mb-1">حالة الطلب</p>
            <span
              class="px-3 py-1 rounded-full text-xs font-bold text-black"
              :class="statusColors[order.state] || 'bg-white-low'"
            >
              {{ statusLabels[order.state] || order.state }}
            </span>
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
              {{
                order.partner_id ? order.partner_id[1] : "عميل نقدي"
              }}
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
                  <th class="px-3 py-2 text-[11px] font-bold">المنتج</th>
                  <th class="px-3 py-2 text-[11px] font-bold">الكمية</th>
                  <th class="px-3 py-2 text-[11px] font-bold">السعر</th>
                  <th class="px-3 py-2 text-[11px] font-bold">الخصم</th>
                  <th class="px-3 py-2 text-[11px] font-bold">الإجمالي</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/40">
                <tr
                  v-for="line in lines"
                  :key="line.id"
                  class="hover:bg-white-low/50"
                >
                  <td class="px-3 py-3 text-body-md font-bold text-on-white">
                    {{
                      line.product_id
                        ? line.product_id[1]
                        : `#${line.product_id?.[0] || ""}`
                    }}
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
                </tr>
                <tr v-if="lines.length === 0">
                  <td
                    colspan="5"
                    class="p-6 text-center text-on-white-variant text-sm"
                  >
                    لا توجد أصناف في هذه الفاتورة
                  </td>
                </tr>
              </tbody>
            </table>
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
                  <td class="px-3 py-3 text-body-md font-bold text-primary">
                    {{ Number(pay.amount).toFixed(2) }} ج.م
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
                </tr>
                <tr v-if="payments.length === 0">
                  <td
                    colspan="3"
                    class="p-6 text-center text-on-white-variant text-sm"
                  >
                    لا توجد مدفوعات مسجلة
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Totals Summary -->
        <div
          class="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2"
        >
          <div class="flex justify-between text-body-md">
            <span class="text-on-white-variant">المجموع الفرعي</span>
            <span class="font-bold tabular-nums">
              {{ totalFromLines.toFixed(2) }} ج.م
            </span>
          </div>
          <div
            v-if="(order.order_discount || 0) > 0"
            class="flex justify-between text-body-md text-error"
          >
            <span>الخصم</span>
            <span class="font-bold tabular-nums"
              >-{{ Number(order.order_discount || 0).toFixed(2) }} ج.م</span
            >
          </div>
          <div
            v-if="(order.service_fee || 0) > 0"
            class="flex justify-between text-body-md text-amber-600"
          >
            <span>رسوم إضافية</span>
            <span class="font-bold tabular-nums"
              >+{{ Number(order.service_fee || 0).toFixed(2) }} ج.م</span
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
              {{ Number(order.amount_total).toFixed(2) }} ج.م
            </span>
          </div>
          <div class="flex justify-between text-body-md">
            <span class="text-on-white-variant">المدفوع</span>
            <span class="font-bold text-success tabular-nums"
              >{{ Number(order.amount_paid).toFixed(2) }} ج.م</span
            >
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="p-4 bg-white-high border-t border-outline-variant shrink-0"
      >
        <button
          @click="closeDrawer"
          class="w-full py-3 rounded-xl border border-outline font-bold text-on-white hover:bg-white transition-all cursor-pointer active:scale-95 text-center"
        >
          إغلاق
        </button>
      </div>
    </div>
  </div>
</template>

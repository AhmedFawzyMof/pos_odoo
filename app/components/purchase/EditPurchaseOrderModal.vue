<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  X,
  LoaderCircle,
  AlertTriangle,
  CheckCircle,
  FileEdit,
  Warehouse,
} from "@lucide/vue";
import type { Supplier, POLineInput } from "~/types/purchase";
import type {
  PurchaseOrder,
  PurchaseOrderDetail,
  POLine,
} from "~/types/purchaseOrder";

const props = defineProps<{
  open: boolean;
  purchaseOrder: PurchaseOrder | null;
}>();

const emit = defineEmits<{
  (e: "update:open", val: boolean): void;
  (e: "saved", po: Partial<PurchaseOrder> & { id: number }): void;
}>();

const isLoading = ref(false);
const loadError = ref("");
const loadId = ref(0);
const selectedSupplier = ref<Supplier | null>(null);
const dateOrder = ref("");
const notes = ref("");
const state = ref("draft");
const receiptStatus = ref("pending");
const lines = ref<POLineInput[]>([]);
const isSaving = ref(false);
const saveSuccess = ref(false);
const saveError = ref("");
const poName = ref("");
const selectedLocationId = ref<number | null>(null);
const locations = ref<{ id: number; name: string }[]>([]);

const fetchLocations = async () => {
  try {
    const res = await $fetch<{ success: boolean; data: { id: number; name: string }[] }>(
      "/api/warehouse/locations",
    );
    locations.value = (res.data || []).filter((l: any) => l.type === "internal");
    if (locations.value.length > 0 && !selectedLocationId.value) {
      selectedLocationId.value = locations.value[0].id;
    }
  } catch {
    locations.value = [];
  }
};

const validationError = computed(() => {
  if (!selectedSupplier.value) return "يرجى اختيار المورد";
  if (lines.value.length === 0) return "يرجى إضافة منتج واحد على الأقل";
  for (const l of lines.value) {
    if (!l.product_id) return "جميع المنتجات يجب أن تحتوي على معرف منتج صحيح";
    if (!l.quantity || l.quantity <= 0) return "الكمية يجب أن تكون أكبر من صفر";
    if (l.price_unit < 0) return "السعر لا يمكن أن يكون سالباً";
  }
  return "";
});

const fetchDetail = async (poId: number) => {
  isLoading.value = true;
  loadError.value = "";
  try {
    const res = await $fetch<{ success: boolean; data: PurchaseOrderDetail }>(
      "/api/purchase-orders/detail",
      { params: { id: poId } },
    );
    const detail = res?.data || res;
    return detail as PurchaseOrderDetail;
  } catch (err: any) {
    loadError.value =
      err?.data?.statusMessage || err?.message || "فشل تحميل تفاصيل الأمر";
    return null;
  } finally {
    isLoading.value = false;
  }
};

function polineToInput(line: POLine): POLineInput {
  return {
    id: line.id,
    product_id: line.product_id ? line.product_id[0] : null,
    product_name: line.name,
    quantity: line.product_qty,
    price_unit: line.price_unit,
    list_price: line.list_price,
    tax_ids: line.tax_ids.map((t: any) => t.id),
    location_allocations: (line.location_allocations || []).map((a) => ({
      location_id: a.location_id,
      location_name: a.location_name,
      quantity: a.quantity,
    })),
  };
}

const loadPO = async () => {
  if (!props.purchaseOrder) return;
  const po = props.purchaseOrder;
  const currentLoadId = ++loadId.value;
  poName.value = po.name;

  if (po.partner_id) {
    selectedSupplier.value = { id: po.partner_id[0], name: po.partner_id[1] };
  } else {
    selectedSupplier.value = null;
  }
  dateOrder.value = po.date_order || new Date().toISOString().slice(0, 10);
  state.value = po.state || "draft";
  receiptStatus.value = po.receipt_status || "pending";
  notes.value = "";
  saveError.value = "";
  lines.value = [];
  selectedLocationId.value = null;

  const detail = await fetchDetail(po.id);
  if (currentLoadId !== loadId.value) return;
  if (detail) {
    notes.value = detail.notes || "";
    lines.value = detail.lines.map(polineToInput);
    const firstAlloc = lines.value[0]?.location_allocations?.[0];
    if (firstAlloc) {
      selectedLocationId.value = firstAlloc.location_id;
    }
  }
  fetchLocations();
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) loadPO();
  },
  { immediate: true },
);

watch(
  () => props.purchaseOrder,
  (po) => {
    if (po && props.open) loadPO();
  },
  { immediate: true },
);

const save = async () => {
  if (validationError.value) return;
  isSaving.value = true;
  saveError.value = "";

  try {
    const body = {
      po_id: props.purchaseOrder!.id,
      partner_id: selectedSupplier.value?.id,
      date_order: dateOrder.value,
      notes: notes.value || undefined,
      state: state.value,
      receipt_status: receiptStatus.value,
      lines: lines.value.map((l) => ({
        id: l.id || undefined,
        product_id: l.product_id,
        quantity: l.quantity,
        price_unit: l.price_unit,
        list_price: l.list_price || 0,
        name: l.product_name,
        tax_ids: l.tax_ids,
        location_allocations: selectedLocationId.value
          ? [{ location_id: selectedLocationId.value, quantity: l.quantity }]
          : [],
      })),
    };

    const res = await $fetch<{ success: boolean; message?: string }>(
      "/api/purchase-orders/update",
      { method: "POST", body },
    );

    if ((res as any)?.success) {
      const total = lines.value.reduce(
        (s, l) => s + l.quantity * l.price_unit,
        0,
      );
      const updatedPO: Partial<PurchaseOrder> & { id: number } = {
        id: props.purchaseOrder!.id,
        partner_id: selectedSupplier.value
          ? [selectedSupplier.value.id, selectedSupplier.value.name]
          : false,
        date_order: dateOrder.value,
        state: state.value,
        receipt_status: receiptStatus.value,
        amount_untaxed: total,
      };
      saveSuccess.value = true;
      setTimeout(() => {
        emit("saved", updatedPO);
        closeModal();
        isSaving.value = false;
        saveSuccess.value = false;
      }, 800);
    } else {
      saveError.value = (res as any)?.message || "فشل في تحديث أمر الشراء";
      isSaving.value = false;
    }
  } catch (err: any) {
    saveError.value =
      err?.data?.statusMessage || err?.message || "فشل الاتصال بالخادم";
    isSaving.value = false;
  }
};

const closeModal = () => {
  emit("update:open", false);
};
</script>

<template>
  <Transition name="modal-scale">
    <div
      v-if="props.open"
      class="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden"
    >
      <div
        class="flex items-center justify-between p-6 border-b border-outline-variant"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary"
          >
            <FileEdit class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-headline-sm font-bold text-on-white">
              تعديل أمر الشراء
            </h2>
            <p class="text-label-md text-on-white-variant">
              {{ poName ? `تعديل الأمر ${poName}` : "تحميل..." }}
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

      <div
        class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 max-w-7xl mx-auto w-full"
      >
        <div v-if="isLoading" class="flex items-center justify-center py-20">
          <div class="flex flex-col items-center gap-3 text-on-white-variant">
            <LoaderCircle class="w-8 h-8 animate-spin text-primary" />
            <span class="text-[13px]">جاري تحميل تفاصيل الأمر...</span>
          </div>
        </div>

        <template v-else>
          <div
            v-if="loadError"
            class="bg-error/10 border border-error text-error p-4 rounded-xl flex items-center gap-3"
          >
            <AlertTriangle class="w-6 h-6 shrink-0" />
            <span class="font-bold">{{ loadError }}</span>
          </div>

          <div
            v-if="saveError"
            class="bg-error/10 border border-error text-error p-4 rounded-xl flex items-center gap-3"
          >
            <AlertTriangle class="w-6 h-6 shrink-0" />
            <span class="font-bold">{{ saveError }}</span>
          </div>

          <div
            v-if="saveSuccess"
            class="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3"
          >
            <CheckCircle class="w-6 h-6 text-emerald-500" />
            <span class="font-bold">تم حفظ التعديلات بنجاح</span>
          </div>

          <template v-if="!loadError">
            <PurchaseSupplierSearchSelect
              :selected-supplier="selectedSupplier"
            />

            <div class="space-y-1.5">
              <label class="text-label-md font-bold text-on-white-variant"
                >تاريخ الأمر</label
              >
              <input
                v-model="dateOrder"
                type="date"
                class="w-full h-11 px-4 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-label-md font-bold text-on-white-variant"
                  >الحالة</label
                >
                <select
                  v-model="state"
                  class="w-full h-11 px-3 border border-outline-variant rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="draft">مسودة</option>
                  <option value="sent">مرسل</option>
                  <option value="purchase">مؤكد</option>
                  <option value="done">مكتمل</option>
                  <option value="cancel">ملغي</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="text-label-md font-bold text-on-white-variant"
                  >حالة الاستلام</label
                >
                <select
                  v-model="receiptStatus"
                  class="w-full h-11 px-3 border border-outline-variant rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="pending">معلق</option>
                  <option value="partial">جزئي</option>
                  <option value="done">مكتمل</option>
                </select>
              </div>
            </div>

            <!-- Storage Location -->
            <div class="space-y-1.5">
              <label class="text-label-md font-bold text-on-white-variant"
                >موقع التخزين</label>
              <select
                v-model="selectedLocationId"
                class="w-full h-11 px-3 border border-outline-variant rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="" disabled>اختر موقع التخزين</option>
                <option
                  v-for="loc in locations"
                  :key="loc.id"
                  :value="loc.id"
                >{{ loc.name }}</option>
              </select>
            </div>

            <PurchaseProductLinesEditor v-model:lines="lines" />

            <div class="space-y-1.5">
              <label class="text-label-md font-bold text-on-white-variant"
                >ملاحظات</label
              >
              <textarea
                v-model="notes"
                class="w-full h-24 px-4 py-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white resize-none"
                placeholder="ملاحظات إضافية لأمر الشراء..."
              />
            </div>

            <div
              v-if="validationError"
              class="text-error text-label-md font-bold flex items-center gap-1"
            >
              <AlertTriangle class="w-4 h-4" />
              {{ validationError }}
            </div>
          </template>
        </template>
      </div>

      <div
        class="flex items-center justify-end gap-3 p-6 border-t border-outline-variant"
      >
        <button
          @click="closeModal"
          class="px-5 py-2.5 border border-outline-variant rounded-lg font-bold hover:bg-white-low cursor-pointer"
        >
          إلغاء
        </button>
        <button
          @click="save"
          :disabled="isSaving || saveSuccess || isLoading || !!loadError"
          class="px-6 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
        >
          <LoaderCircle v-if="isSaving" class="w-4 h-4 animate-spin" />
          <template v-else-if="saveSuccess">
            <CheckCircle class="w-4 h-4" /> تم
          </template>
          <template v-else>حفظ التعديلات</template>
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

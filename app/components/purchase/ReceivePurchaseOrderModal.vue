<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  X,
  LoaderCircle,
  AlertTriangle,
  CheckCircle,
  Warehouse,
  Package,
} from "@lucide/vue";
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
  (e: "confirm", data: { po_id: number; lines: any[] }): void;
}>();

const isLoading = ref(false);
const loadError = ref("");
const loadId = ref(0);
const poName = ref("");
const poSupplier = ref("");
const lines = ref<(POLine & { qty_to_receive: number })[]>([]);
const selectedLocationId = ref<number | null>(null);
const locations = ref<{ id: number; name: string }[]>([]);
const isConfirming = ref(false);

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
  if (locations.value.length === 0) return "لا توجد مواقع تخزين متاحة";
  if (!selectedLocationId.value) return "يرجى اختيار موقع التخزين";
  if (lines.value.length === 0) return "لا توجد منتجات للاستلام";
  for (const l of lines.value) {
    if (l.qty_to_receive < 0) return "الكمية لا يمكن أن تكون سالبة";
  }
  const hasAny = lines.value.some((l) => l.qty_to_receive > 0);
  if (!hasAny) return "يرجى إدخال كمية مستلمة لمنتج واحد على الأقل";
  return "";
});

const totalToReceive = computed(() =>
  lines.value.reduce((s, l) => s + l.qty_to_receive, 0),
);

const fetchDetail = async (poId: number) => {
  isLoading.value = true;
  loadError.value = "";
  try {
    const res = await $fetch<{ success: boolean; data: PurchaseOrderDetail }>(
      "/api/purchase-orders/detail",
      { params: { id: poId } },
    );
    const detail = (res as any)?.data || res;
    return detail as PurchaseOrderDetail;
  } catch (err: any) {
    loadError.value =
      err?.data?.statusMessage || err?.message || "فشل تحميل تفاصيل الأمر";
    return null;
  } finally {
    isLoading.value = false;
  }
};

const loadPO = async () => {
  if (!props.purchaseOrder) return;
  const po = props.purchaseOrder;
  const currentLoadId = ++loadId.value;
  poName.value = po.name;
  poSupplier.value = po.partner_id ? po.partner_id[1] : "-";

  lines.value = [];
  selectedLocationId.value = null;

  const detail = await fetchDetail(po.id);
  if (currentLoadId !== loadId.value) return;
  if (detail) {
    lines.value = detail.lines.map((line) => {
      const remaining = line.product_qty - line.qty_received;
      return {
        ...line,
        qty_to_receive: remaining > 0 ? remaining : 0,
      };
    });
    const firstAlloc = detail.lines[0]?.location_allocations?.[0];
    if (firstAlloc) {
      selectedLocationId.value = firstAlloc.location_id;
    }
  }
  await fetchLocations();
};

watch(
  [() => props.open, () => props.purchaseOrder],
  ([isOpen]) => {
    if (isOpen) {
      isConfirming.value = false;
      loadPO();
    }
  },
  { immediate: true },
);

const confirmReceive = () => {
  if (validationError.value) return;
  isConfirming.value = true;

  const linesPayload = lines.value
    .filter((l) => l.qty_to_receive > 0)
    .map((l) => ({
      product_id: l.product_id ? l.product_id[0] : null,
      qty_received: l.qty_to_receive,
      location_allocations: selectedLocationId.value
        ? [{ location_id: selectedLocationId.value, quantity: l.qty_to_receive }]
        : [],
    }))
    .filter((l) => l.product_id);

  emit("confirm", {
    po_id: props.purchaseOrder!.id,
    lines: linesPayload,
  });
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
            class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600"
          >
            <Warehouse class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-headline-sm font-bold text-on-white">
              استلام المنتجات
            </h2>
            <p class="text-label-md text-on-white-variant">
              {{ poName ? `استلام أمر الشراء ${poName}` : "تحميل..." }}
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

          <template v-if="!loadError">
            <!-- PO Info -->
            <div class="grid grid-cols-2 gap-4 p-4 bg-white-low rounded-xl">
              <div>
                <span class="text-label-md text-on-white-variant">رقم الأمر</span>
                <p class="font-bold text-body-md">{{ poName }}</p>
              </div>
              <div>
                <span class="text-label-md text-on-white-variant">المورد</span>
                <p class="font-bold text-body-md">{{ poSupplier }}</p>
              </div>
            </div>

            <!-- Storage Location -->
            <div class="space-y-1.5">
              <label class="text-label-md font-bold text-on-white-variant">
                <Warehouse class="w-4 h-4 inline ml-1" />
                موقع التخزين
              </label>
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

            <!-- Lines Table -->
            <div class="border border-outline-variant rounded-xl overflow-hidden">
              <table class="w-full text-right border-collapse">
                <thead class="bg-white-low text-on-white-variant">
                  <tr>
                    <th class="p-3 text-label-md font-bold">المنتج</th>
                    <th class="p-3 text-label-md font-bold">الكمية المطلوبة</th>
                    <th class="p-3 text-label-md font-bold">المستلم سابقاً</th>
                    <th class="p-3 text-label-md font-bold">الكمية المستلمة</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-variant/45">
                  <tr
                    v-for="(line, idx) in lines"
                    :key="idx"
                    class="hover:bg-primary/5"
                  >
                    <td class="p-3 font-bold text-body-md">
                      <div class="flex items-center gap-2">
                        <Package class="w-4 h-4 text-on-white-variant shrink-0" />
                        <span>{{ line.name }}</span>
                      </div>
                    </td>
                    <td class="p-3 text-on-white-variant">
                      {{ line.product_qty }}
                    </td>
                    <td class="p-3 text-on-white-variant">
                      {{ line.qty_received }}
                    </td>
                    <td class="p-3">
                      <input
                        v-model.number="line.qty_to_receive"
                        type="number"
                        min="0"
                        :max="line.product_qty - line.qty_received"
                        step="1"
                        class="w-24 h-9 px-2 border border-outline-variant rounded-lg text-center text-body-md outline-none focus:ring-2 focus:ring-primary"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
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
        class="flex items-center justify-between p-6 border-t border-outline-variant"
      >
        <div class="text-label-md text-on-white-variant">
          إجمالي المستلم: <span class="font-bold text-primary">{{ totalToReceive }}</span>
        </div>
        <div class="flex gap-3">
          <button
            @click="closeModal"
            class="px-5 py-2.5 border border-outline-variant rounded-lg font-bold hover:bg-white-low cursor-pointer"
          >
            إلغاء
          </button>
          <button
            @click="confirmReceive"
            :disabled="isConfirming || isLoading || !!loadError || !!validationError"
            class="px-6 py-2.5 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            <LoaderCircle v-if="isConfirming" class="w-4 h-4 animate-spin" />
            <template v-else><Warehouse class="w-4 h-4" /> تأكيد الاستلام</template>
          </button>
        </div>
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

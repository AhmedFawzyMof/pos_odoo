<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  X,
  LoaderCircle,
  AlertTriangle,
  CheckCircle,
  FileText,
  Warehouse,
} from "@lucide/vue";
import type { Supplier, POLineInput } from "~/types/purchase";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: "update:open", val: boolean): void;
  (e: "created"): void;
}>();

const activeTab = ref<"manual" | "from-bill">("manual");

const selectedSupplier = ref<Supplier | null>(null);
const dateOrder = ref(new Date().toISOString().slice(0, 10));
const notes = ref("");
const lines = ref<POLineInput[]>([]);

const isSaving = ref(false);
const saveSuccess = ref(false);
const saveError = ref("");

const drawerOpen = ref(false);
const drawerMode = ref<"add" | "edit">("add");
const isSavingSupplier = ref(false);
const actionError = ref("");

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

const onBillSelected = (detail: {
  supplierId: number;
  supplierName: string;
  invoiceDate: string;
  lines: POLineInput[];
}) => {
  if (detail.supplierId) {
    selectedSupplier.value = {
      id: detail.supplierId,
      name: detail.supplierName,
    };
  }
  if (detail.invoiceDate) {
    dateOrder.value = detail.invoiceDate;
  }
  lines.value = detail.lines;
};

const openAddSupplier = () => {
  drawerMode.value = "add";
  actionError.value = "";
  drawerOpen.value = true;
};

const saveSupplier = async (payload: Record<string, any>) => {
  isSavingSupplier.value = true;
  actionError.value = "";
  try {
    const response = await $fetch<{
      success: boolean;
      id: number;
      message: string;
    }>("/api/suppliers/save", { method: "POST", body: payload });
    if (response.success) {
      drawerOpen.value = false;
    }
  } catch (err: any) {
    actionError.value = err.message || err.statusMessage || "خطأ في الاتصال بالنظام";
  } finally {
    isSavingSupplier.value = false;
  }
};

const submit = async () => {
  if (validationError.value) return;
  isSaving.value = true;
  saveError.value = "";
  saveSuccess.value = false;

  try {
    const body = {
      partner_id: selectedSupplier.value!.id,
      date_order: dateOrder.value,
      lines: lines.value.map((l) => ({
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
      notes: notes.value || undefined,
    };
    const res = await $fetch("/api/purchase-orders", {
      method: "POST",
      body,
    });
    if ((res as any)?.success) {
      saveSuccess.value = true;
      setTimeout(() => {
        emit("created");
        closeModal();
      }, 1000);
    } else {
      saveError.value = (res as any)?.message || "فشل في إنشاء أمر الشراء";
    }
  } catch (err: any) {
    saveError.value =
      err?.data?.statusMessage || err?.message || "حدث خطأ غير متوقع";
  } finally {
    isSaving.value = false;
  }
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetForm();
      fetchLocations();
    }
  },
);

const closeModal = () => {
  emit("update:open", false);
};

const resetForm = () => {
  activeTab.value = "manual";
  selectedSupplier.value = null;
  dateOrder.value = new Date().toISOString().slice(0, 10);
  notes.value = "";
  lines.value = [];
  selectedLocationId.value = null;
  saveSuccess.value = false;
  saveError.value = "";
};
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
              <FileText class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-headline-sm font-bold text-on-white">
                إنشاء فتورة شراء
              </h2>
              <p class="text-label-md text-on-white-variant">
                إضافة أمر شراء جديد للمورد
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

        <!-- Tabs -->
        <div class="flex border-b border-outline-variant px-6 pt-4 gap-4">
          <button
            @click="activeTab = 'manual'"
            class="pb-3 px-1 text-label-md font-bold border-b-2 transition-colors cursor-pointer"
            :class="
              activeTab === 'manual'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-white-variant hover:text-on-white'
            "
          >
            إدخال يدوي
          </button>
          <button
            @click="activeTab = 'from-bill'"
            class="pb-3 px-1 text-label-md font-bold border-b-2 transition-colors cursor-pointer"
            :class="
              activeTab === 'from-bill'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-white-variant hover:text-on-white'
            "
          >
            من فاتورة موردين
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 max-w-7xl mx-auto w-full">
          <!-- Success -->
          <div
            v-if="saveSuccess"
            class="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3"
          >
            <CheckCircle class="w-6 h-6 text-emerald-500" />
            <span class="font-bold">تم إنشاء أمر الشراء بنجاح</span>
          </div>

          <!-- Error -->
          <div
            v-if="saveError"
            class="bg-error/10 border border-error text-error p-4 rounded-xl flex items-center gap-3"
          >
            <AlertTriangle class="w-6 h-6 shrink-0" />
            <span class="font-bold">{{ saveError }}</span>
          </div>

          <PurchaseSupplierSearchSelect v-model:supplier="selectedSupplier" @create="openAddSupplier" />

          <!-- Date -->
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

          <!-- From Bill: Search Bills -->
          <div v-if="activeTab === 'from-bill'">
            <PurchaseVendorBillSelector @bill-selected="onBillSelected" />
          </div>

          <PurchaseProductLinesEditor v-model:lines="lines" />

          <!-- Notes -->
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

          <!-- Validation -->
          <div
            v-if="validationError"
            class="text-error text-label-md font-bold flex items-center gap-1"
          >
            <AlertTriangle class="w-4 h-4" />
            {{ validationError }}
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
            إلغاء
          </button>
          <button
            @click="submit"
            :disabled="isSaving || saveSuccess"
            class="px-6 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            <LoaderCircle v-if="isSaving" class="w-4 h-4 animate-spin" />
            <template v-else-if="saveSuccess">
              <CheckCircle class="w-4 h-4" /> تم
            </template>
            <template v-else>إنشاء أمر الشراء</template>
          </button>
        </div>
    </div>
  </Transition>

  <SuppliersSupplierDrawer
    :is-open="drawerOpen"
    :mode="drawerMode"
    :supplier="null"
    :is-saving="isSavingSupplier"
    :action-error="actionError"
    @update:is-open="drawerOpen = $event"
    @update:action-error="actionError = $event"
    @save="saveSupplier"
  />
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

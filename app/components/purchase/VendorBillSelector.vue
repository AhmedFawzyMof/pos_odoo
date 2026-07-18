<script setup lang="ts">
import { ref, watch } from "vue";
import { X, LoaderCircle, CheckCircle } from "@lucide/vue";
import type { VendorBillResult, VendorBillLine } from "~/types/vendorBill";

interface VendorBillDetail {
  id: number;
  partner_id: [number, string] | false;
  invoice_date: string;
  lines: VendorBillLine[];
}

const emit = defineEmits<{
  (
    e: "bill-selected",
    detail: {
      supplierId: number;
      supplierName: string;
      invoiceDate: string;
      lines: {
        product_id: number | null;
        product_name: string;
        quantity: number;
        price_unit: number;
        tax_ids: number[];
      }[];
    },
  ): void;
}>();

const search = ref("");
const results = ref<VendorBillResult[]>([]);
const isSearching = ref(false);
const showDropdown = ref(false);
const selectedBillId = ref<number | null>(null);
const isLoadingLines = ref(false);

let debounce: NodeJS.Timeout;

watch(search, (q) => {
  const clean = q.trim();
  if (!clean || selectedBillId.value) {
    results.value = [];
    showDropdown.value = false;
    return;
  }
  clearTimeout(debounce);
  debounce = setTimeout(async () => {
    isSearching.value = true;
    try {
      const res = await $fetch<{ success: boolean; data: VendorBillResult[] }>(
        "/api/vendor-bills",
        { params: { search: clean, page: 1, limit: 10 } },
      );
      results.value = res.data || [];
      showDropdown.value = true;
    } catch {
      results.value = [];
    } finally {
      isSearching.value = false;
    }
  }, 300);
});

const select = async (bill: VendorBillResult) => {
  selectedBillId.value = bill.id;
  search.value = `${bill.name} - ${bill.partner_id ? bill.partner_id[1] : ""}`;
  showDropdown.value = false;
  isLoadingLines.value = true;
  try {
    const detail = await $fetch<VendorBillDetail>("/api/vendor-bills/detail", {
      params: { id: bill.id },
    });
    const lines = (detail.lines || []).map((l) => ({
      product_id: l.product_id ? l.product_id[0] : null,
      product_name: l.name,
      quantity: l.quantity,
      price_unit: l.price_unit,
      tax_ids: l.tax_ids.map((t) => t.id),
    }));
    emit("bill-selected", {
      supplierId: detail.partner_id ? detail.partner_id[0] : 0,
      supplierName: detail.partner_id ? detail.partner_id[1] : "",
      invoiceDate: detail.invoice_date,
      lines,
    });
  } catch {
    emit("bill-selected", {
      supplierId: 0,
      supplierName: "",
      invoiceDate: "",
      lines: [],
    });
  } finally {
    isLoadingLines.value = false;
  }
};

const clear = () => {
  selectedBillId.value = null;
  search.value = "";
  showDropdown.value = false;
};

const paymentStateLabel = (state: string) => {
  if (state === "paid") return "مدفوع";
  if (state === "overdue") return "متأخر";
  return "مستحق";
};

const paymentStateClass = (state: string) => {
  if (state === "paid") return "bg-emerald-100 text-emerald-800";
  if (state === "overdue") return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-800";
};
</script>

<template>
  <div class="space-y-1.5">
    <label class="text-label-md font-bold text-on-white-variant"
      >اختيار فاتورة موردين</label
    >
    <div class="relative">
      <div class="flex items-center gap-2">
        <input
          v-model="search"
          :disabled="!!selectedBillId"
          class="flex-1 h-11 px-4 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white text-on-white disabled:bg-white-low"
          placeholder="ابحث برقم الفاتورة أو اسم المورد..."
          type="text"
        />
        <button
          v-if="selectedBillId"
          @click="clear"
          class="shrink-0 w-9 h-9 rounded-lg hover:bg-error/10 flex items-center justify-center text-error cursor-pointer"
          title="إزالة الفاتورة"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
      <div
        v-if="showDropdown && results.length > 0"
        class="absolute z-10 mt-1 w-full bg-white border border-outline-variant rounded-xl shadow-lg max-h-48 overflow-y-auto"
      >
        <button
          v-for="b in results"
          :key="b.id"
          @click="select(b)"
          class="w-full text-right px-4 py-3 hover:bg-primary/5 cursor-pointer border-b border-outline-variant/30 last:border-0"
        >
          <div class="flex items-center justify-between">
            <span class="font-bold">{{ b.name }}</span>
            <span class="text-label-md text-on-white-variant">{{
              b.partner_id ? b.partner_id[1] : ""
            }}</span>
          </div>
          <div class="flex items-center justify-between mt-1">
            <span class="text-label-md"
              >{{ b.amount_total.toLocaleString("en-US") }} ج.م</span
            >
            <span
              class="text-xs font-bold px-2 py-0.5 rounded-full"
              :class="paymentStateClass(b.payment_state)"
            >
              {{ paymentStateLabel(b.payment_state) }}
            </span>
          </div>
        </button>
      </div>
      <div
        v-if="isSearching || isLoadingLines"
        class="absolute left-3 top-1/2 -translate-y-1/2"
      >
        <LoaderCircle class="w-4 h-4 animate-spin text-primary" />
      </div>
    </div>
    <p
      v-if="selectedBillId && !isLoadingLines"
      class="text-label-md text-emerald-600 flex items-center gap-1"
    >
      <CheckCircle class="w-4 h-4" /> تم نسخ المنتجات من الفاتورة
    </p>
  </div>
</template>

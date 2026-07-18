<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  RefreshCw,
  CloudOff,
  Eye,
} from "@lucide/vue";
import { usePermissions } from "~/composables/usePermissions";
import ReceiptPreview from "~/components/receipt/ReceiptPreview.vue";
import ReceiptConfigForm from "~/components/receipt/ReceiptConfigForm.vue";

const route = useRoute();
const { canViewPage } = usePermissions();

if (import.meta.client) {
  if (!canViewPage(route.path)) {
    navigateTo('/')
  }
}

const {
  data: apiResponse,
  status,
  error,
  refresh,
  pending,
} = useFetch<{
  success: boolean;
  data: any;
  states: any[];
  countries: any[];
}>("/api/receipt/config", {
  lazy: true,
});

const states = computed(() => apiResponse.value?.states ?? []);
const countries = computed(() => apiResponse.value?.countries ?? []);
const remoteData = computed(() => apiResponse.value?.data ?? null);

const localConfig = ref<any>({
  company: {
    id: null,
    name: "",
    companyRegistry: "",
    logo: null,
    email: "",
    phone: "",
    website: "",
    vat: "",
    address: {
      street: "",
      street2: "",
      city: "",
      stateId: null,
      zip: "",
      countryId: null,
    },
  },
  receipt: {
    titleAr: "فاتورة بيع",
    titleEn: "SALES INVOICE",
    fontFamily: "Courier New, monospace",
    fontSize: 12,
    fontWeight: "normal",
    width: 280,
    header: { enabled: true, companyName: true, companyLogo: true, companyAddress: true, companyPhone: true, companyEmail: true, companyWebsite: true, companyVat: true, showQrCode: false, qrCodeText: "" },
    items: { enabled: true, showDescription: true, showPrice: true, showQuantity: true, showTotal: true, showDiscount: true, showTax: false },
    payments: { enabled: true, showMethod: true, showAmount: true, showChange: false },
    totals: { enabled: true, showSubtotal: true, showDiscount: true, showServiceFee: true, showTax: true, showGrandTotal: true, currency: "ج.م" },
    footer: { enabled: true, showThankYou: true, thankYouText: "شكراً لتسوقكم معنا", showOrderNumber: true, showDate: true, showTime: true, showCashier: false, showTerms: false, termsText: "" },
    colors: { primary: "#000000", secondary: "#333333", accent: "#666666", text: "#000000", background: "#ffffff" },
    layout: { headerStyle: "standard", footerStyle: "standard", showDivider: true, dividerStyle: "dashed", showBorder: true, borderStyle: "solid" },
  },
});

const initConfig = () => {
  if (remoteData.value) {
    localConfig.value = JSON.parse(JSON.stringify(remoteData.value));
  }
};

watch(remoteData, (val) => {
  if (val) initConfig();
});

const isSaving = ref(false);
const actionError = ref("");
const actionSuccess = ref("");

const handleSave = async () => {
  isSaving.value = true;
  actionError.value = "";
  actionSuccess.value = "";

  try {
    const res = await $fetch<{ success: boolean }>("/api/receipt/config", {
      method: "POST",
      body: localConfig.value,
    });

    if (res.success) {
      actionSuccess.value = "تم حفظ التصميم بنجاح";
      await refresh();
      initConfig();
    }
  } catch (err: any) {
    actionError.value = err.message || err.statusMessage || "حدث خطأ أثناء الحفظ";
  } finally {
    isSaving.value = false;
  }
};

const handleDiscard = () => {
  initConfig();
  actionError.value = "";
  actionSuccess.value = "";
};

const filteredStates = computed(() => {
  const countryId = localConfig.value.company?.address?.countryId;
  if (!countryId) return states.value;
  return states.value.filter(
    (s: any) => s.country_id?.[0] === countryId,
  );
});

const collapsedSections = ref<Record<string, boolean>>({
  company: false,
  header: false,
  items: false,
  payments: false,
  totals: false,
  footer: false,
  appearance: false,
  layout: false,
});

function toggleSection(section: string) {
  collapsedSections.value[section] = !collapsedSections.value[section];
}

function updateConfig(val: any) {
  localConfig.value = val;
}

const demoData = computed(() => {
  return {
    orderName: "فاتورة #1234",
    date: new Date().toLocaleDateString("ar-EG"),
    time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    items: [
      { name: "منتج 1", qty: 2, price: 50.00 },
      { name: "منتج 2", qty: 1, price: 75.50 },
      { name: "منتج 3", qty: 3, price: 25.00 },
    ],
    subtotal: 250.50,
    discount: 25.05,
    serviceFee: 10.00,
    grandTotal: 235.45,
    payments: [
      { method: "نقدي", amount: 235.45 },
    ],
  };
});
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <div
      v-if="pending && !remoteData"
      class="h-[calc(100vh-200px)] flex items-center justify-center"
    >
      <div class="flex flex-col items-center gap-3">
        <RefreshCw class="w-8 h-8 animate-spin text-primary" />
        <span class="text-[13px] text-muted-foreground">جاري التحميل...</span>
      </div>
    </div>

    <template v-else>
      <div
        v-if="status === 'error'"
        class="bg-error/10 border border-error text-error p-6 rounded-2xl text-center"
      >
        <CloudOff class="w-10 h-10 mb-2 inline-block" />
        <p class="font-bold">فشل تحميل إعدادات الفاتورة</p>
        <p class="text-sm opacity-80">{{ error?.message }}</p>
        <button
          @click="refresh()"
          class="mt-4 px-6 py-2 bg-error text-white rounded-full font-bold cursor-pointer"
        >
          إعادة المحاولة
        </button>
      </div>

      <template v-else>
        <div
          v-if="actionSuccess"
          class="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-lg text-sm"
        >
          {{ actionSuccess }}
        </div>
        <div
          v-if="actionError"
          class="mb-4 p-3 bg-error/10 border border-error/30 text-error font-bold rounded-lg text-sm"
        >
          {{ actionError }}
        </div>

        <!-- Desktop: 2-panel layout -->
        <div class="hidden lg:flex gap-6 items-start">
          <div class="flex-1 sticky top-6">
            <div class="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
              <div class="flex items-center gap-2 mb-4 pb-3 border-b border-outline-variant">
                <Eye class="w-5 h-5 text-primary" />
                <span class="font-bold text-sm">معاينة الفاتورة</span>
              </div>
              <ReceiptPreview :config="localConfig" :demo-data="demoData" />
            </div>
          </div>

          <div class="w-[500px] shrink-0">
            <ReceiptConfigForm
              :config="localConfig"
              :collapsed-sections="collapsedSections"
              :states="states"
              :countries="countries"
              :filtered-states="filteredStates"
              :is-saving="isSaving"
              @update:config="updateConfig"
              @toggle-section="toggleSection"
              @save="handleSave"
              @discard="handleDiscard"
            />
          </div>
        </div>

        <!-- Mobile: stacked layout -->
        <div class="lg:hidden space-y-4">
          <div class="bg-white border border-outline-variant rounded-xl p-4 shadow-sm">
            <div class="flex items-center gap-2 mb-3 pb-2 border-b border-outline-variant">
              <Eye class="w-5 h-5 text-primary" />
              <span class="font-bold text-sm">معاينة الفاتورة</span>
            </div>
            <ReceiptPreview :config="localConfig" :demo-data="demoData" />
          </div>

          <ReceiptConfigForm
            :config="localConfig"
            :collapsed-sections="collapsedSections"
            :states="states"
            :countries="countries"
            :filtered-states="filteredStates"
            :is-saving="isSaving"
            @update:config="updateConfig"
            @toggle-section="toggleSection"
            @save="handleSave"
            @discard="handleDiscard"
          />
        </div>
      </template>
    </template>
  </div>
</template>

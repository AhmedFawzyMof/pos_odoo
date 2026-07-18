<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  RefreshCw,
  CloudOff,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Receipt,
  FileText,
  Upload,
} from "@lucide/vue";
import { usePermissions } from "~/composables/usePermissions";

const route = useRoute();
const { canViewPage } = usePermissions();

if (import.meta.client) {
  if (!canViewPage(route.path)) {
    navigateTo('/')
  }
}

interface CompanyData {
  id: number;
  name: string;
  partnerId: number;
  companyRegistry: string;
  logo: string | null;
  email: string;
  phone: string;
  website: string;
  street: string;
  street2: string;
  city: string;
  stateId: number | null;
  zip: string;
  countryId: number | null;
  vat: string;
}

interface StateOption {
  id: number;
  name: string;
  country_id: [number, string];
}

interface CountryOption {
  id: number;
  name: string;
}

const {
  data: apiResponse,
  status,
  error,
  refresh,
  pending,
} = useFetch<{
  success: boolean;
  data: CompanyData;
  states: StateOption[];
  countries: CountryOption[];
}>("/api/company/profile", {
  lazy: true,
});

const company = computed(() => apiResponse.value?.data ?? null);
const states = computed(() => apiResponse.value?.states ?? []);
const countries = computed(() => apiResponse.value?.countries ?? []);

const editName = ref("");
const editEmail = ref("");
const editPhone = ref("");
const editWebsite = ref("");
const editStreet = ref("");
const editStreet2 = ref("");
const editCity = ref("");
const editStateId = ref<number | null>(null);
const editZip = ref("");
const editCountryId = ref<number | null>(null);
const editVat = ref("");
const editCompanyRegistry = ref("");
const editLogo = ref("");
const logoFile = ref<File | null>(null);
const logoPreview = ref<string | null>(null);
const isSaving = ref(false);
const actionError = ref("");
const actionSuccess = ref("");

const filteredStates = computed(() => {
  if (!editCountryId.value) return states.value;
  return states.value.filter(
    (s) => s.country_id?.[0] === editCountryId.value,
  );
});

const initForm = () => {
  if (company.value) {
    editName.value = company.value.name || "";
    editEmail.value = company.value.email || "";
    editPhone.value = company.value.phone || "";
    editWebsite.value = company.value.website || "";
    editStreet.value = company.value.street || "";
    editStreet2.value = company.value.street2 || "";
    editCity.value = company.value.city || "";
    editStateId.value = company.value.stateId;
    editZip.value = company.value.zip || "";
    editCountryId.value = company.value.countryId;
    editVat.value = company.value.vat || "";
    editCompanyRegistry.value = company.value.companyRegistry || "";
    editLogo.value = company.value.logo || "";
    logoPreview.value = company.value.logo
      ? `data:image/png;base64,${company.value.logo}`
      : null;
    logoFile.value = null;
  }
};

const handleLogoChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    logoFile.value = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      logoPreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(input.files[0]);
  }
};

const handleSave = async () => {
  if (!company.value) return;
  isSaving.value = true;
  actionError.value = "";
  actionSuccess.value = "";

  try {
    const body: Record<string, any> = {
      companyId: company.value.id,
      partnerId: company.value.partnerId,
      name: editName.value,
      email: editEmail.value,
      phone: editPhone.value,
      website: editWebsite.value,
      street: editStreet.value,
      street2: editStreet2.value,
      city: editCity.value,
      stateId: editStateId.value,
      zip: editZip.value,
      countryId: editCountryId.value,
      vat: editVat.value,
      companyRegistry: editCompanyRegistry.value,
    };

    if (logoFile.value) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(logoFile.value);
      });
      body.logo = base64;
    }

    const res = await $fetch<{ success: boolean }>("/api/company/profile", {
      method: "POST",
      body,
    });

    if (res.success) {
      actionSuccess.value = "تم حفظ التغييرات بنجاح";
      await refresh();
      initForm();
    }
  } catch (err: any) {
    actionError.value = err.message || err.statusMessage || "حدث خطأ أثناء الحفظ";
  } finally {
    isSaving.value = false;
  }
};

const handleDiscard = () => {
  initForm();
  actionError.value = "";
  actionSuccess.value = "";
};

watch(company, (val) => {
  if (val) initForm();
});
</script>

<template>
  <div class="space-y-8 max-w-7xl mx-auto">
    <div
      v-if="pending && !company"
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
        <p class="font-bold">فشل تحميل بيانات الشركة</p>
        <p class="text-sm opacity-80">{{ error?.message }}</p>
        <button
          @click="refresh()"
          class="mt-4 px-6 py-2 bg-error text-white rounded-full font-bold cursor-pointer"
        >
          إعادة المحاولة
        </button>
      </div>

      <template v-else-if="company">
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

        <div
          class="bg-white border border-outline-variant rounded-xl p-6 md:p-8 shadow-sm max-w-3xl mx-auto"
        >
          <div class="flex flex-col md:flex-row gap-8">
            <div class="flex flex-col items-center gap-3 shrink-0">
              <div
                class="w-32 h-32 rounded-2xl bg-primary/5 border-2 border-primary/10 overflow-hidden flex items-center justify-center p-3"
              >
                <img
                  v-if="logoPreview"
                  :src="logoPreview"
                  class="w-full h-full object-contain"
                  alt="Company Logo"
                />
                <Building2 v-else class="w-16 h-16 text-primary/30" />
              </div>
              <label
                class="px-4 py-2 text-sm font-bold text-primary border border-primary rounded-lg hover:bg-primary/5 cursor-pointer transition-all flex items-center gap-2"
              >
                <Upload class="w-4 h-4" />
                تغيير الشعار
                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleLogoChange"
                />
              </label>
            </div>

            <div class="flex-1 space-y-5">
              <div class="space-y-2">
                <label class="block text-sm font-bold text-muted-foreground">
                  <Building2 class="w-3.5 h-3.5 inline ml-1" />
                  اسم الشركة
                </label>
                <input
                  v-model="editName"
                  class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  type="text"
                />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="block text-sm font-bold text-muted-foreground">
                    <Mail class="w-3.5 h-3.5 inline ml-1" />
                    البريد الإلكتروني
                  </label>
                  <input
                    v-model="editEmail"
                    class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    type="email"
                  />
                </div>
                <div class="space-y-2">
                  <label class="block text-sm font-bold text-muted-foreground">
                    <Phone class="w-3.5 h-3.5 inline ml-1" />
                    الهاتف
                  </label>
                  <input
                    v-model="editPhone"
                    class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    type="tel"
                  />
                </div>
              </div>

              <div class="space-y-2">
                <label class="block text-sm font-bold text-muted-foreground">
                  <Globe class="w-3.5 h-3.5 inline ml-1" />
                  الموقع الإلكتروني
                </label>
                <input
                  v-model="editWebsite"
                  class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  type="text"
                />
              </div>

              <div class="border-t border-outline-variant pt-5">
                <h4 class="text-sm font-bold text-muted-foreground mb-4 flex items-center gap-2">
                  <MapPin class="w-4 h-4" />
                  العنوان
                </h4>
                <div class="space-y-3">
                  <div class="space-y-2">
                    <label class="block text-xs font-bold text-muted-foreground">
                      الشارع
                    </label>
                    <input
                      v-model="editStreet"
                      class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      type="text"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="block text-xs font-bold text-muted-foreground">
                      الشارع (تابع)
                    </label>
                    <input
                      v-model="editStreet2"
                      class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      type="text"
                    />
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                      <label class="block text-xs font-bold text-muted-foreground">
                        المدينة
                      </label>
                      <input
                        v-model="editCity"
                        class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        type="text"
                      />
                    </div>
                    <div class="space-y-2">
                      <label class="block text-xs font-bold text-muted-foreground">
                        الرمز البريدي
                      </label>
                      <input
                        v-model="editZip"
                        class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        type="text"
                      />
                    </div>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                      <label class="block text-xs font-bold text-muted-foreground">
                        الدولة
                      </label>
                      <select
                        v-model="editCountryId"
                        class="w-full h-11 px-3 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                      >
                        <option :value="null">اختر الدولة...</option>
                        <option
                          v-for="c in countries"
                          :key="c.id"
                          :value="c.id"
                        >
                          {{ c.name }}
                        </option>
                      </select>
                    </div>
                    <div class="space-y-2">
                      <label class="block text-xs font-bold text-muted-foreground">
                        المحافظة / المنطقة
                      </label>
                      <select
                        v-model="editStateId"
                        class="w-full h-11 px-3 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                      >
                        <option :value="null">اختر المحافظة...</option>
                        <option
                          v-for="s in filteredStates"
                          :key="s.id"
                          :value="s.id"
                        >
                          {{ s.name }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div class="border-t border-outline-variant pt-5">
                <h4 class="text-sm font-bold text-muted-foreground mb-4 flex items-center gap-2">
                  <Receipt class="w-4 h-4" />
                  التسجيل الضريبي
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <label class="block text-xs font-bold text-muted-foreground">
                      الرقم الضريبي (VAT)
                    </label>
                    <input
                      v-model="editVat"
                      class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      type="text"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="block text-xs font-bold text-muted-foreground">
                      <FileText class="w-3 h-3 inline ml-1" />
                      السجل التجاري
                    </label>
                    <input
                      v-model="editCompanyRegistry"
                      class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      type="text"
                    />
                  </div>
                </div>
              </div>

              <div class="pt-4 flex gap-4">
                <button
                  type="button"
                  @click="handleSave"
                  :disabled="isSaving"
                  class="flex-1 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 transition-all cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw
                    v-if="isSaving"
                    class="w-5 h-5 inline-block animate-spin ml-1"
                  />
                  حفظ التغييرات
                </button>
                <button
                  type="button"
                  @click="handleDiscard"
                  class="flex-1 py-3 border border-outline-variant text-foreground font-bold rounded-lg hover:bg-muted/50 transition-all cursor-pointer text-center"
                >
                  إلغاء التغييرات
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

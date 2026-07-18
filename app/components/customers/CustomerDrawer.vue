<script setup lang="ts">
import { ref, watch } from "vue";
import { X, Star, RefreshCw } from "@lucide/vue";
import type { Customer } from "~/types/customer";

const props = defineProps<{
  isOpen: boolean;
  mode: "view" | "add" | "edit";
  customer: Customer | null;
  isSaving: boolean;
  actionError: string;
}>();

const emit = defineEmits<{
  (e: "update:isOpen", value: boolean): void;
  (e: "update:actionError", value: string): void;
  (e: "save", payload: Record<string, any>): void;
}>();

const formName = ref("");
const formEmail = ref("");
const formPhone = ref("");
const formType = ref<"فرد" | "B2B">("فرد");
const formTier = ref("فضي");
const formAddress = ref("");
const formTaxId = ref("");

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      if (props.mode === "add") {
        formName.value = "";
        formEmail.value = "";
        formPhone.value = "";
        formType.value = "فرد";
        formTier.value = "فضي";
        formAddress.value = "";
        formTaxId.value = "";
      } else if (
        (props.mode === "edit" || props.mode === "view") &&
        props.customer
      ) {
        formName.value = props.customer.name;
        formEmail.value = props.customer.email;
        formPhone.value = props.customer.phone;
        formType.value = props.customer.type;
        formTier.value = props.customer.tier;
        formAddress.value = props.customer.address;
        formTaxId.value = props.customer.taxId;
      }
    }
  },
);

const closeDrawer = () => {
  emit("update:isOpen", false);
  emit("update:actionError", "");
};

const saveCustomer = () => {
  if (!formName.value || !formPhone.value) {
    emit("update:actionError", "يرجى ملء الاسم ورقم الهاتف");
    return;
  }

  emit("save", {
    id: props.mode === "edit" && props.customer ? props.customer.id : undefined,
    name: formName.value,
    email: formEmail.value,
    phone: formPhone.value,
    street: formAddress.value,
    vat: formTaxId.value,
    is_company: formType.value === "B2B",
    tier: formTier.value,
  });
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
      <div
        class="p-6 border-b border-outline-variant flex items-center justify-between bg-white"
      >
        <h4 class="text-headline-sm font-bold text-on-white">
          {{
            mode === "view"
              ? "تفاصيل العميل"
              : mode === "edit"
                ? "تعديل بيانات العميل"
                : "إضافة عميل جديد"
          }}
        </h4>
        <button
          @click="closeDrawer"
          class="p-2 rounded-full hover:bg-white-highest transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar max-w-7xl mx-auto w-full">
        <div
          v-if="actionError"
          class="flex items-start gap-3 bg-error-container/20 border border-error/30 px-4 py-3 rounded-xl"
        >
          <p class="text-sm flex-1 text-error font-bold">{{ actionError }}</p>
          <button
            @click="$emit('update:actionError', '')"
            class="text-error hover:text-error/70 cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- View Mode -->
        <div v-if="mode === 'view' && customer" class="space-y-6">
          <div class="flex flex-col items-center">
            <div
              class="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary text-headline-md font-bold mb-3 shadow-inner"
            >
              {{ customer.name.slice(0, 2) }}
            </div>
            <h5 class="text-headline-md font-bold">{{ customer.name }}</h5>
            <p class="text-body-md text-on-white-variant">
              عميل {{ customer.tier }}
            </p>
          </div>

          <div class="space-y-4">
            <h6
              class="text-label-md font-bold text-primary border-r-4 border-primary pr-3"
            >
              المعلومات الشخصية
            </h6>
            <div class="grid grid-cols-2 gap-4 bg-white-low p-4 rounded-xl">
              <div>
                <p
                  class="text-[10px] text-on-white-variant uppercase font-bold mb-0.5"
                >
                  الهاتف
                </p>
                <p class="text-body-md font-bold">{{ customer.phone }}</p>
              </div>
              <div>
                <p
                  class="text-[10px] text-on-white-variant uppercase font-bold mb-0.5"
                >
                  البريد الإلكتروني
                </p>
                <p class="text-body-md">{{ customer.email }}</p>
              </div>
              <div class="col-span-2">
                <p
                  class="text-[10px] text-on-white-variant uppercase font-bold mb-0.5"
                >
                  العنوان
                </p>
                <p class="text-body-md">{{ customer.address || "غير محدد" }}</p>
              </div>
              <div>
                <p
                  class="text-[10px] text-on-white-variant uppercase font-bold mb-0.5"
                >
                  الرقم الضريبي
                </p>
                <p class="text-body-md font-mono">{{ customer.taxId }}</p>
              </div>
              <div>
                <p
                  class="text-[10px] text-on-white-variant uppercase font-bold mb-0.5"
                >
                  فئة الحساب
                </p>
                <p class="text-body-md font-bold text-primary">
                  {{ customer.type }}
                </p>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <h6
              class="text-label-md font-bold text-primary border-r-4 border-primary pr-3"
            >
              برنامج الولاء
            </h6>
            <div
              class="bg-primary/5 p-4 rounded-xl border border-primary/20 flex justify-between items-center"
            >
              <div>
                <p class="text-headline-md font-bold text-primary">
                  {{ customer.points.toLocaleString("en-US") }} نقطة
                </p>
                <p class="text-xs text-on-white-variant">
                  الرصيد القابل للاستبدال
                </p>
              </div>
              <Star class="w-[42px] h-[42px] text-primary" />
            </div>
          </div>
        </div>

        <!-- Add / Edit Mode -->
        <div v-else class="space-y-4">
          <h6
            class="text-label-md font-bold text-primary border-r-4 border-primary pr-3"
          >
            البيانات الأساسية
          </h6>
          <div class="space-y-4">
            <div class="relative">
              <input
                v-model="formName"
                class="peer w-full h-12 px-4 pt-4 border-b-2 border-outline-variant focus:border-primary bg-transparent text-body-md outline-none transition-all"
                placeholder=" "
                type="text"
              />
              <label
                class="absolute right-4 top-1 text-[10px] text-on-white-variant peer-placeholder-shown:text-label-md peer-placeholder-shown:top-3 transition-all pointer-events-none"
              >
                الاسم الكامل للعميل
              </label>
            </div>

            <div class="relative">
              <input
                v-model="formPhone"
                class="peer w-full h-12 px-4 pt-4 border-b-2 border-outline-variant focus:border-primary bg-transparent text-body-md outline-none transition-all"
                placeholder=" "
                type="text"
              />
              <label
                class="absolute right-4 top-1 text-[10px] text-on-white-variant peer-placeholder-shown:text-label-md peer-placeholder-shown:top-3 transition-all pointer-events-none"
              >
                رقم الهاتف الجوال
              </label>
            </div>

            <div class="relative">
              <input
                v-model="formEmail"
                class="peer w-full h-12 px-4 pt-4 border-b-2 border-outline-variant focus:border-primary bg-transparent text-body-md outline-none transition-all"
                placeholder=" "
                type="email"
              />
              <label
                class="absolute right-4 top-1 text-[10px] text-on-white-variant peer-placeholder-shown:text-label-md peer-placeholder-shown:top-3 transition-all pointer-events-none"
              >
                البريد الإلكتروني
              </label>
            </div>

            <div class="relative">
              <input
                v-model="formAddress"
                class="peer w-full h-12 px-4 pt-4 border-b-2 border-outline-variant focus:border-primary bg-transparent text-body-md outline-none transition-all"
                placeholder=" "
                type="text"
              />
              <label
                class="absolute right-4 top-1 text-[10px] text-on-white-variant peer-placeholder-shown:text-label-md peer-placeholder-shown:top-3 transition-all pointer-events-none"
              >
                العنوان بالتفصيل
              </label>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  class="block text-xs font-bold text-on-white-variant mb-1"
                  >نوع الحساب</label
                >
                <select
                  v-model="formType"
                  class="w-full h-11 px-3 bg-white border border-outline-variant rounded-lg text-body-md outline-none cursor-pointer"
                >
                  <option value="فرد">فرد</option>
                  <option value="B2B">شركة (B2B)</option>
                </select>
              </div>
              <div>
                <label
                  class="block text-xs font-bold text-on-white-variant mb-1"
                  >فئة الولاء</label
                >
                <select
                  v-model="formTier"
                  class="w-full h-11 px-3 bg-white border border-outline-variant rounded-lg text-body-md outline-none cursor-pointer"
                >
                  <option value="بلاتيني">بلاتيني</option>
                  <option value="ذهبي">ذهبي</option>
                  <option value="فضي">فضي</option>
                </select>
              </div>
            </div>

            <div v-if="formType === 'B2B'" class="relative">
              <input
                v-model="formTaxId"
                class="peer w-full h-12 px-4 pt-4 border-b-2 border-outline-variant focus:border-primary bg-transparent text-body-md font-mono outline-none transition-all"
                placeholder=" "
                type="text"
              />
              <label
                class="absolute right-4 top-1 text-[10px] text-on-white-variant peer-placeholder-shown:text-label-md peer-placeholder-shown:top-3 transition-all pointer-events-none"
              >
                الرقم الضريبي للمنشأة
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="p-6 bg-white-high flex gap-4 shrink-0">
        <button
          @click="closeDrawer"
          class="flex-1 py-3 rounded-xl border border-outline font-bold text-on-white hover:bg-white transition-all cursor-pointer active:scale-95 text-center"
        >
          إغلاق
        </button>
        <button
          v-if="mode !== 'view'"
          @click="saveCustomer"
          :disabled="isSaving"
          class="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg hover:bg-primary/95 transition-all cursor-pointer active:scale-95 text-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            v-if="isSaving"
            class="w-5 h-5 inline-block animate-spin ml-1"
          />
          {{ mode === "edit" ? "تحديث البيانات" : "حفظ العميل" }}
        </button>
      </div>
    </div>
  </div>
</template>

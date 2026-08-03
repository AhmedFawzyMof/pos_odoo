<script setup lang="ts">
import { ref, watch } from "vue";
import { X, Truck, RefreshCw } from "@lucide/vue";
import type { Driver } from "~/types/driver";

const props = defineProps<{
  isOpen: boolean;
  mode: "add" | "edit";
  driver: Driver | null;
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

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      if (props.mode === "add") {
        formName.value = "";
        formEmail.value = "";
        formPhone.value = "";
      } else if (props.mode === "edit" && props.driver) {
        formName.value = props.driver.name;
        formEmail.value = props.driver.email;
        formPhone.value = props.driver.phone;
      }
    }
  },
);

const closeDrawer = () => {
  emit("update:isOpen", false);
  emit("update:actionError", "");
};

const saveDriver = () => {
  if (!formName.value.trim()) {
    emit("update:actionError", "يرجى إدخال اسم السائق");
    return;
  }

  emit("save", {
    id: props.mode === "edit" && props.driver ? props.driver.id : undefined,
    name: formName.value,
    email: formEmail.value,
    phone: formPhone.value,
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
          {{ mode === "edit" ? "تعديل بيانات السائق" : "إضافة سائق جديد" }}
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

        <div class="space-y-4">
          <div
            class="flex flex-col items-center"
            v-if="mode === 'edit' && driver"
          >
            <div
              class="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary text-headline-md font-bold mb-3 shadow-inner"
            >
              {{ driver.name.slice(0, 2) }}
            </div>
            <h5 class="text-headline-md font-bold">{{ driver.name }}</h5>
            <p class="text-body-md text-on-white-variant">سائق توصيل</p>
          </div>

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
                اسم السائق
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
          @click="saveDriver"
          :disabled="isSaving"
          class="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg hover:bg-primary/95 transition-all cursor-pointer active:scale-95 text-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            v-if="isSaving"
            class="w-5 h-5 inline-block animate-spin ml-1"
          />
          <Truck v-else class="w-5 h-5 inline-block ml-1" />
          {{ mode === "edit" ? "تحديث البيانات" : "حفظ السائق" }}
        </button>
      </div>
    </div>
  </div>
</template>

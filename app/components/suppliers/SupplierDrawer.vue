<script setup lang="ts">
import { ref, watch } from "vue";
import { X, RefreshCw, Truck, Info, Building2 } from "@lucide/vue";
import type { Supplier } from "~/types/supplier";
import { usePermissions } from '~/composables/usePermissions'
const { can } = usePermissions()

const props = defineProps<{
  isOpen: boolean;
  mode: "add" | "edit";
  supplier: Supplier | null;
  isSaving: boolean;
  actionError: string;
}>();

const emit = defineEmits<{
  (e: "update:isOpen", value: boolean): void;
  (e: "update:actionError", value: string): void;
  (e: "save", payload: Record<string, any>): void;
}>();

const formData = ref<Record<string, any>>({});

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      if (props.mode === "add") {
        formData.value = {
          name: "",
          email: "",
          phone: "",
          street: "",
          city: "",
          vat: "",
        };
      } else if (props.mode === "edit" && props.supplier) {
        formData.value = {
          id: props.supplier.id,
          name: props.supplier.name,
          email: props.supplier.email,
          phone: props.supplier.phone,
          street: props.supplier.street,
          city: props.supplier.city,
          vat: props.supplier.vat,
        };
      }
    }
  },
);

const closeDrawer = () => {
  emit("update:isOpen", false);
  emit("update:actionError", "");
};

const saveSupplier = () => {
  emit("save", formData.value);
};
</script>

<template>
  <Transition name="modal-scale">
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity flex justify-center"
      @click.self="closeDrawer"
    >
      <div
        class="h-full w-full bg-white shadow-2xl flex flex-col relative transition-transform duration-300"
        @click.stop
      >
        <!-- Header -->
        <div
          class="p-6 border-b border-outline-variant flex items-center justify-between bg-white"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"
            >
              <Truck class="w-5 h-5" />
            </div>
            <h4 class="text-headline-sm font-bold text-on-white">
              {{ mode === "add" ? "إضافة مورد جديد" : "تعديل بيانات المورد" }}
            </h4>
          </div>
          <button
            @click="closeDrawer"
            class="p-2 rounded-full hover:bg-white-highest transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <div
          class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar max-w-7xl mx-auto w-full"
        >
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

          <form @submit.prevent="saveSupplier" class="space-y-6">
            <div class="space-y-4">
              <h6
                class="text-label-md font-bold text-primary border-r-4 border-primary pr-3"
              >
                <Info class="w-4 h-4 inline-block ml-1" />
                البيانات الأساسية
              </h6>
              <div class="space-y-4">
                <div>
                  <label
                    class="block text-label-md text-on-white-variant font-bold mb-1"
                  >
                    اسم المورد *
                  </label>
                  <input
                    v-model="formData.name"
                    class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    type="text"
                    required
                  />
                </div>
                <div>
                  <label
                    class="block text-label-md text-on-white-variant font-bold mb-1"
                  >
                    البريد الإلكتروني
                  </label>
                  <input
                    v-model="formData.email"
                    class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    type="email"
                  />
                </div>
                <div>
                  <label
                    class="block text-label-md text-on-white-variant font-bold mb-1"
                  >
                    رقم الهاتف
                  </label>
                  <input
                    v-model="formData.phone"
                    class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    type="text"
                  />
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <h6
                class="text-label-md font-bold text-primary border-r-4 border-primary pr-3"
              >
                <Building2 class="w-4 h-4 inline-block ml-1" />
                العنوان والتواصل
              </h6>
              <div class="space-y-4">
                <div>
                  <label
                    class="block text-label-md text-on-white-variant font-bold mb-1"
                  >
                    العنوان
                  </label>
                  <input
                    v-model="formData.street"
                    class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    type="text"
                  />
                </div>
                <div>
                  <label
                    class="block text-label-md text-on-white-variant font-bold mb-1"
                  >
                    المدينة
                  </label>
                  <input
                    v-model="formData.city"
                    class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    type="text"
                  />
                </div>
                <div>
                  <label
                    class="block text-label-md text-on-white-variant font-bold mb-1"
                  >
                    الرقم الضريبي
                  </label>
                  <input
                    v-model="formData.vat"
                    class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    type="text"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div class="p-6 bg-white-high flex gap-4 shrink-0">
          <button
            type="button"
            @click="closeDrawer"
            class="flex-1 py-3 rounded-xl border border-outline font-bold text-on-white hover:bg-white transition-all cursor-pointer active:scale-95 text-center"
          >
            إلغاء
          </button>
          <button
            @click="saveSupplier"
            :disabled="isSaving"
            class="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg hover:bg-primary/95 transition-all cursor-pointer active:scale-95 text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              v-if="isSaving"
              class="w-5 h-5 inline-block animate-spin ml-1"
            />
            {{ mode === "edit" ? "تحديث البيانات" : "حفظ المورد" }}
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

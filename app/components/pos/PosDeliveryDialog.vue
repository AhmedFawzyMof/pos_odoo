<script setup lang="ts">
import { ref, watch } from "vue";
import { X, Truck, RefreshCw } from "@lucide/vue";
import type { Driver } from "~/types/driver";

const props = defineProps<{
  isOpen: boolean;
  driverId: number | null;
  driverName: string;
  deliveryCost: number;
}>();

const emit = defineEmits<{
  (e: "update:isOpen", value: boolean): void;
  (e: "save", payload: { driverId: number | null; driverName: string; deliveryCost: number }): void;
}>();

const selectedDriverId = ref<number | null>(null);
const costInput = ref<string>("");
const loadingDrivers = ref(false);
const driversError = ref("");
const drivers = ref<Driver[]>([]);

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      selectedDriverId.value = props.driverId;
      costInput.value = props.deliveryCost > 0 ? String(props.deliveryCost) : "";
      loadDrivers();
    }
  },
);

async function loadDrivers() {
  loadingDrivers.value = true;
  driversError.value = "";
  try {
    const res = await $fetch<{ success: boolean; data: Driver[] }>(
      "/api/drivers",
      { query: { page: 1 } },
    );
    drivers.value = res.data || [];
  } catch (err: any) {
    driversError.value =
      err.statusMessage || err.message || "فشل تحميل السائقين";
  } finally {
    loadingDrivers.value = false;
  }
}

function closeDialog() {
  emit("update:isOpen", false);
}

function saveDelivery() {
  const cost = parseFloat(costInput.value);
  const validCost = Number.isFinite(cost) && cost > 0 ? cost : 0;
  const driver =
    drivers.value.find((d) => d.id === selectedDriverId.value) || null;
  emit("save", {
    driverId: driver ? driver.id : null,
    driverName: driver ? driver.name : "",
    deliveryCost: validCost,
  });
  closeDialog();
}

function clearDelivery() {
  emit("save", { driverId: null, driverName: "", deliveryCost: 0 });
  closeDialog();
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div class="fixed inset-0 bg-black/50" @click="closeDialog" />
        <div
          class="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 text-right"
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-bold text-on-white flex items-center gap-2">
              <Truck class="w-5 h-5 text-primary" />
              بيانات التوصيل
            </h3>
            <button
              @click="closeDialog"
              class="p-2 rounded-full hover:bg-white-highest transition-colors cursor-pointer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div
            v-if="driversError"
            class="mb-3 bg-error/10 border border-error/30 px-4 py-3 rounded-xl text-sm text-error font-bold"
          >
            {{ driversError }}
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-on-white-variant mb-1">
                سائق التوصيل
              </label>
              <select
                v-model="selectedDriverId"
                :disabled="loadingDrivers"
                class="w-full h-11 px-3 bg-white border border-outline-variant rounded-lg text-body-md outline-none cursor-pointer disabled:opacity-50"
              >
                <option :value="null">بدون سائق</option>
                <option v-for="d in drivers" :key="d.id" :value="d.id">
                  {{ d.name }}
                </option>
              </select>
              <p v-if="loadingDrivers" class="text-xs text-on-white-variant mt-1 flex items-center gap-1">
                <RefreshCw class="w-3 h-3 animate-spin" />
                جاري تحميل السائقين...
              </p>
            </div>

            <div>
              <label class="block text-xs font-bold text-on-white-variant mb-1">
                تكلفة التوصيل (ج.م)
              </label>
              <input
                v-model="costInput"
                type="number"
                min="0"
                step="0.5"
                placeholder="0"
                class="w-full h-11 px-3 bg-white border border-outline-variant rounded-lg text-body-md outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <button
              v-if="driverId"
              @click="clearDelivery"
              class="flex-1 py-3 rounded-xl border border-error/40 text-error font-bold hover:bg-error/5 transition-all cursor-pointer active:scale-95"
            >
              إزالة التوصيل
            </button>
            <button
              @click="saveDelivery"
              class="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg hover:bg-primary/95 transition-all cursor-pointer active:scale-95"
            >
              حفظ
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

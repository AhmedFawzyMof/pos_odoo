<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  FolderArchive,
  X,
  Link,
  ChevronDown,
  Folder,
  Search,
  Check,
  FolderOpen,
  AlertTriangle,
  Warehouse,
  Trash2,
  ScanBarcode,
  CheckCircle,
  RefreshCw,
  CheckCheck,
} from "@lucide/vue";
import { usePermissions } from '~/composables/usePermissions'
const { can } = usePermissions()

interface OdooLocation {
  id: number;
  name: string;
  type: string;
  barcode: string;
}

const props = defineProps<{
  open: boolean;
  existingLocations: OdooLocation[];
}>();

const emit = defineEmits<{
  (e: "update:open", val: boolean): void;
  (e: "created", val: any): void;
}>();

const selectedParentLocation = ref<OdooLocation | null>(null);
const newLocationName = ref("");
const newLocationType = ref("internal");
const newLocationBarcode = ref("");
const maxCapacity = ref(5000);

const isSearchDropdownOpen = ref(false);
const parentSearchQuery = ref("");

const isSaving = ref(false);
const saveSuccess = ref(false);
const validationError = ref("");

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.existingLocations.length > 0) {
      if (
        !selectedParentLocation.value ||
        !props.existingLocations.some(
          (l) => l.id === selectedParentLocation.value?.id,
        )
      ) {
        selectedParentLocation.value = props.existingLocations[0] ?? null;
      }
    }
  },
  { immediate: true },
);

  const autoGenerateBarcode = () => {
    if (
      validationError.value.includes("barcode") ||
      validationError.value.includes("اسم")
    ) {
      validationError.value = "";
    }

    const parentPath = selectedParentLocation.value
      ? selectedParentLocation.value.name
      : "المخزن";
    const namePart = newLocationName.value.trim()
      ? newLocationName.value.trim()
      : "SLOT";

    const cleanPath = `${parentPath}/${namePart}`
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "-")
      .replace(/-+/g, "-"); // compress redundant dashes

    newLocationBarcode.value = `LOC-${cleanPath}`;
  };

const breadcrumbPreview = computed(() => {
  const parentPath = selectedParentLocation.value
    ? selectedParentLocation.value.name
    : "المخزن/المخزون";
  const namePart = newLocationName.value.trim()
    ? newLocationName.value.trim()
    : "___";
  return `${parentPath}/${namePart}`;
});

const filteredParentLocations = computed(() => {
  if (!parentSearchQuery.value) return props.existingLocations;
  return props.existingLocations.filter((loc) =>
    loc.name.toLowerCase().includes(parentSearchQuery.value.toLowerCase()),
  );
});

const selectParent = (loc: OdooLocation) => {
  selectedParentLocation.value = loc;
  isSearchDropdownOpen.value = false;
  parentSearchQuery.value = "";
};

const close = () => {
  emit("update:open", false);
};

const handleSaveLocation = async () => {
  validationError.value = "";

  if (!newLocationName.value.trim()) {
    validationError.value = "اسم الموقع مطلوب";
    return;
  }

  isSaving.value = true;

  try {
    const response = await $fetch<{ success: boolean; id: number }>(
      "/api/warehouse/create",
      {
        method: "POST",
        body: {
          name: newLocationName.value.trim(),
          type: newLocationType.value,
          parentId: selectedParentLocation.value
            ? selectedParentLocation.value.id
            : null,
          barcode: newLocationBarcode.value || null,
          maxCapacity: maxCapacity.value,
        },
      },
    );

    if (response.success) {
      const parentPath = selectedParentLocation.value
        ? selectedParentLocation.value.name
        : "المستودع/المخزون";
      const finalPath = `${parentPath}/${newLocationName.value.trim()}`;

      emit("created", {
        id: response.id,
        name: finalPath,
        address:
          newLocationType.value === "internal"
            ? "رف تخزين داخلي"
            : newLocationType.value === "scrap"
              ? "مخلفات التصنيع / الحجر الصحي"
              : "مجلد هيكلي عرض",
        status: "نشط",
        statusColor:
          "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
        qty: "0",
        capacity: "0%",
        capacityWidth: "w-[0%]",
        progressBarColor:
          "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
        type: newLocationType.value,
        barcode: newLocationBarcode.value || `LOC-${response.id}`,
      });

      saveSuccess.value = true;

      // Reset fields and close modal
      setTimeout(() => {
        newLocationName.value = "";
        newLocationBarcode.value = "";
        saveSuccess.value = false;
        close();
      }, 1200);
    }
  } catch (error: any) {
    console.error(error);
    validationError.value =
      error.statusMessage ||
      "حدث خطأ أثناء المزامنة";
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-50 bg-white flex flex-col font-sans text-on-white"
      dir="rtl"
    >
        <!-- Form Header Section -->
        <div
          class="p-6 pb-4 border-b border-outline-variant bg-white-low flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <FolderArchive
              class="text-primary bg-primary/10 p-2 rounded-lg w-10 h-10"
            />
            <div>
              <h3 class="text-headline-sm font-bold text-primary">
                إنشاء موقع تخزين جديد
              </h3>
              <p class="text-label-md text-on-white-variant">
                موقع تخزين جديد في الهيكل التنظيمي
              </p>
            </div>
          </div>

          <!-- Close Button -->
          <button
            @click="emit('update:open', false)"
            class="p-2 hover:bg-white rounded-full transition-colors flex items-center justify-center text-on-white-variant hover:text-foreground"
          >
            <X class="w-6 h-6" />
          </button>
        </div>

        <!-- Form Content Block -->
        <div
          class="p-6 space-y-5 overflow-y-auto custom-scrollbar text-right max-w-7xl mx-auto w-full"
        >
          <!-- Monospace Dynamic Real-Time Breadcrumb Path Preview -->
          <div class="p-3.5 bg-white rounded-xl border border-outline-variant">
            <p
              class="text-[11px] font-bold text-on-white-variant mb-1 text-right"
            >
              مسار موقع التخزين المحدث:
            </p>
            <div
              class="font-mono text-primary text-sm tracking-wide flex items-center gap-2 overflow-x-auto justify-start py-0.5"
              dir="ltr"
            >
              <Link class="text-primary w-5 h-5" />
              {{ breadcrumbPreview }}
            </div>
          </div>

          <!-- Field 1: Parent Location Selector (Searchable Dropdown) -->
          <div class="space-y-2">
            <label class="block text-label-md font-bold text-on-white-variant"
              >الموقع الأب</label
            >

            <div class="relative">
              <!-- Searchable Select Trigger Button -->
              <button
                type="button"
                @click="isSearchDropdownOpen = !isSearchDropdownOpen"
                class="h-11 w-full bg-background border border-outline rounded-lg px-4 flex items-center justify-between text-on-white hover:bg-muted/50 transition-all focus:outline-none focus:ring-2 focus:ring-primary text-right font-mono"
                dir="ltr"
              >
                <ChevronDown class="text-on-white-variant w-6 h-6" />
                <span class="flex items-center gap-2">
                  {{
                    selectedParentLocation
                      ? selectedParentLocation.name
                      : "اختر الموقع الأب"
                  }}
                  <Folder class="text-primary w-5 h-5" />
                </span>
              </button>

              <div
                v-if="isSearchDropdownOpen"
                class="absolute bg-white left-0 right-0 mt-2 z-50 bg-white border border-outline-variant rounded-xl shadow-xl overflow-hidden flex flex-col"
              >
                <div
                  class="p-3 border-b border-outline-variant bg-white flex items-center gap-2"
                >
                  <Search class="text-on-white-variant w-5 h-5" />
                  <input
                    v-model="parentSearchQuery"
                    type="text"
                    placeholder="بحث عن موقع..."
                    class="w-full bg-transparent border-0 text-on-white text-sm font-sans focus:outline-none focus:ring-0 placeholder-on-white-variant/50 py-1 text-right"
                    @click.stop
                  />
                  <button
                    v-if="parentSearchQuery"
                    @click.stop="parentSearchQuery = ''"
                    class="text-xs text-primary hover:underline"
                  >
                    مسح
                  </button>
                </div>

                <!-- Dropdown Options List -->
                <div
                  class="max-h-48 overflow-y-auto divide-y divide-outline-variant"
                >
                  <button
                    v-for="loc in filteredParentLocations"
                    :key="loc.id"
                    type="button"
                    @click="selectParent(loc)"
                    class="w-full h-11 px-4 hover:bg-white-low flex items-center justify-between text-right text-xs font-mono text-on-white transition-colors"
                    dir="ltr"
                  >
                    <Check
                      v-if="
                        selectedParentLocation &&
                        selectedParentLocation.id === loc.id
                      "
                      class="text-primary w-5 h-5"
                    />
                    <span v-else class="w-5 h-5"></span>

                    <span class="flex items-center gap-2">
                      {{ loc.name }}
                      <FolderOpen class="text-on-white-variant w-4 h-4" />
                    </span>
                  </button>
                  <div
                    v-if="filteredParentLocations.length === 0"
                    class="p-4 text-center text-on-white-variant font-sans text-xs"
                  >
                    لا توجد نتائج مطابقة
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Field 2: Location Name Input -->
          <div class="space-y-2">
            <label class="block text-label-md font-bold text-on-white-variant"
              >اسم الموقع المحدد</label
            >
            <input
              v-model="newLocationName"
              type="text"
              placeholder="مثال: Shelf-B4 أو Cold-Room"
              class="h-11 w-full bg-background border rounded-lg px-4 text-on-white font-mono text-sm tracking-wide placeholder-on-white-variant/40 focus:outline-none focus:ring-2 focus:ring-primary text-right"
              :class="
                validationError
                  ? 'border-error focus:ring-error bg-error/5'
                  : 'border-outline focus:border-primary'
              "
            />
            <span
              v-if="validationError"
              class="text-xs text-error font-semibold flex items-center gap-1 mt-0.5 justify-start text-right"
            >
              <AlertTriangle class="w-4 h-4" />
              {{ validationError }}
            </span>
          </div>

          <!-- Field 3: Location Type Selection (Simplified segment chips matching primary colors) -->
          <div class="space-y-2">
            <label class="block text-label-md font-bold text-on-white-variant"
              >نوع التخزين</label
            >

            <div class="grid grid-cols-3 gap-2">
              <!-- Option 1: Internal Location -->
              <button
                type="button"
                @click="newLocationType = 'internal'"
                class="h-14 flex flex-col items-center justify-center gap-1 rounded-lg border text-center transition-all duration-200 active:scale-95 cursor-pointer"
                :class="
                  newLocationType === 'internal'
                    ? 'border-primary bg-primary text-white font-bold shadow-sm shadow-primary/20'
                    : 'border-outline bg-background hover:bg-muted text-on-white-variant'
                "
              >
                <Warehouse class="w-5 h-5" />
                <span class="text-xs">داخلي للتخزين</span>
              </button>

              <!-- Option 2: Scrap Location -->
              <button
                type="button"
                @click="newLocationType = 'scrap'"
                class="h-14 flex flex-col items-center justify-center gap-1 rounded-lg border text-center transition-all duration-200 active:scale-95 cursor-pointer"
                :class="
                  newLocationType === 'scrap'
                    ? 'border-primary bg-primary text-white font-bold shadow-sm shadow-primary/20'
                    : 'border-outline bg-background hover:bg-muted text-on-white-variant'
                "
              >
                <Trash2 class="w-5 h-5" />
                <span class="text-xs">مخلفات التصنيع / التصفي</span>
              </button>

              <!-- Option 3: View Folder -->
              <button
                type="button"
                @click="newLocationType = 'view'"
                class="h-14 flex flex-col items-center justify-center gap-1 rounded-lg border text-center transition-all duration-200 active:scale-95 cursor-pointer"
                :class="
                  newLocationType === 'view'
                    ? 'border-primary bg-primary text-white font-bold shadow-sm shadow-primary/20'
                    : 'border-outline bg-background hover:bg-muted text-on-white-variant'
                "
              >
                <FolderArchive class="w-5 h-5" />
                <span class="text-xs">مجلد عرض هيكلي</span>
              </button>
            </div>
          </div>

          <!-- Field 4: Barcode Configurations -->
          <div class="space-y-3">
            <label class="block text-label-md font-bold text-on-white-variant"
              >الباركود المخصص</label
            >
            <div class="flex gap-2">
              <!-- Auto-Generate Trigger Action Button -->
              <button
                type="button"
                @click="autoGenerateBarcode"
                class="h-11 px-4 bg-muted hover:bg-muted/80 border border-outline rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-on-white shrink-0"
              >
                <ScanBarcode class="text-primary w-5 h-5" />
                توليد تلقائي
              </button>

              <!-- Barcode Input Field -->
              <input
                v-model="newLocationBarcode"
                type="text"
                placeholder="الرمز الشريطي للرف..."
                class="h-11 w-full bg-background border border-outline rounded-lg px-4 text-on-white font-mono text-sm tracking-wider placeholder-on-white-variant/40 focus:outline-none focus:ring-2 focus:ring-primary text-right"
              />
            </div>
          </div>

          <!-- Field 5: Max Capacity -->
          <div v-if="newLocationType === 'internal'" class="space-y-2">
            <label class="block text-label-md font-bold text-on-white-variant"
              >السعة القصوى</label
            >
            <div class="relative">
              <input
                v-model.number="maxCapacity"
                type="number"
                min="1"
                step="100"
                class="h-11 w-full bg-background border border-outline rounded-lg px-4 text-on-white font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span
                class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-on-white-variant"
              >وحدة</span
              >
            </div>
          </div>
        </div>

        <!-- Dialog Footer Actions Row -->
        <div
          class="p-6 bg-white-low border-t border-outline-variant flex items-center justify-end gap-3"
        >
          <!-- Muted Cancel Action Button -->
          <button
            type="button"
            @click="emit('update:open', false)"
            class="h-11 px-5 border border-outline hover:bg-muted text-on-white font-bold rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer text-sm"
          >
            إلغاء
          </button>

          <!-- Primary Save Action Button -->
          <button
            v-if="can('warehouse.createLocation')"
            type="button"
            @click="handleSaveLocation"
            :disabled="isSaving || saveSuccess"
            class="h-11 px-6 bg-primary text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
          >
            <CheckCircle
              v-if="saveSuccess"
              class="w-5 h-5 text-white animate-bounce"
            />
            <RefreshCw
              v-else-if="isSaving"
              class="w-5 h-5 text-white animate-spin"
            />
            <CheckCheck v-else class="w-5 h-5 text-white" />

            <span>
              {{
                saveSuccess
                  ? "تم إنشاء الموقع بنجاح!"
                  : isSaving
                    ? "جاري المزامنة..."
                    : "حفظ ومزامنة"
              }}
            </span>
          </button>
        </div>
    </div>
  </Transition>
</template>

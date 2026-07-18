<script setup lang="ts">
interface LocationItem {
  id: number;
  name: string;
  address: string;
  type: string;
  qty: string;
  status?: string;
  statusColor?: string;
  maxCapacity?: number;
  usedQty?: number;
  capacity?: string;
  capacityWidth?: string;
  progressBarColor?: string;
}

import { ref } from "vue";
import {
  Warehouse,
  Plus,
  ArrowRightLeft,
  Store,
  FolderArchive,
  Trash2,
  MapPin,
  Pencil,
  Check,
  X,
  ClipboardCheck,
} from "@lucide/vue";
import { usePermissions } from "~/composables/usePermissions";
const { can } = usePermissions();

const props = defineProps<{
  locations: LocationItem[];
}>();

const emit = defineEmits<{
  (e: "create-location"): void;
  (e: "stock-transfer"): void;
  (e: "stock-reconciliation"): void;
  (e: "updated"): void;
}>();

const editingId = ref<number | null>(null);
const editingField = ref<"name" | "address" | null>(null);
const editValue = ref("");
const saving = ref(false);

const confirmingDeleteId = ref<number | null>(null);
const deleting = ref(false);

const changingTypeId = ref<number | null>(null);
const newType = ref<string>("");

const USAGE_LABELS: Record<string, string> = {
  internal: "مخزن",
  view: "مجلد هيكلي",
  inventory: "مخلفات",
};

async function deleteLocation(loc: LocationItem) {
  if (deleting.value) return;
  deleting.value = true;
  try {
    await $fetch(`/api/warehouse/${loc.id}`, { method: "DELETE" });
    confirmingDeleteId.value = null;
    emit("updated");
  } catch (e: any) {
    console.error("Delete failed", e);
  } finally {
    deleting.value = false;
  }
}

const changingUsage = ref(false);

async function changeType(loc: LocationItem) {
  if (changingUsage.value) return;
  changingUsage.value = true;
  try {
    await $fetch(`/api/warehouse/${loc.id}`, {
      method: "PUT",
      body: { usage: newType.value },
    });
    changingTypeId.value = null;
    emit("updated");
  } catch (e: any) {
    console.error("Change type failed", e);
  } finally {
    changingUsage.value = false;
  }
}

function startEdit(loc: LocationItem, field: "name" | "address") {
  editingId.value = loc.id;
  editingField.value = field;
  editValue.value = loc[field];
}

function cancelEdit() {
  editingId.value = null;
  editingField.value = null;
  editValue.value = "";
}

async function saveEdit(loc: LocationItem) {
  if (saving.value) return;
  if (!editValue.value.trim() || editValue.value === loc[editingField.value!]) {
    cancelEdit();
    return;
  }
  saving.value = true;
  try {
    await $fetch(`/api/warehouse/${loc.id}`, {
      method: "PUT",
      body: { [editingField.value!]: editValue.value.trim() },
    });
    loc[editingField.value!] = editValue.value.trim();
    emit("updated");
  } catch (e) {
    console.error("Save failed", e);
  } finally {
    saving.value = false;
    cancelEdit();
  }
}

function onKeydown(e: KeyboardEvent, loc: LocationItem) {
  if (e.key === "Enter") saveEdit(loc);
  else if (e.key === "Escape") cancelEdit();
}
</script>

<template>
  <div
    class="lg:col-span-2 bg-white rounded-xl border border-outline-variant overflow-hidden"
  >
    <div
      class="p-6 border-b border-outline-variant flex flex-col md:flex-row justify-between items-center md:items-start bg-white/50 backdrop-blur-sm sticky top-0"
    >
      <h2 class="text-headline-sm font-bold flex items-center gap-2">
        <Warehouse class="text-primary w-6 h-6" />
        المواقع والمخازن
      </h2>
      <div class="flex gap-2 flex-col md:flex-row">
        <button
          v-if="can('warehouse.createLocation')"
          @click="$emit('create-location')"
          class="px-4 py-2 bg-primary text-white rounded-lg text-label-md font-bold flex items-center gap-2 hover:bg-primary/90 transition-all active:scale-95 cursor-pointer"
        >
          <Plus class="w-5 h-5" />
          إنشاء موقع جديد
        </button>
        <button
          v-if="can('warehouse.reconciliation')"
          @click="$emit('stock-reconciliation')"
          class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-label-md font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all active:scale-95 cursor-pointer"
        >
          <ClipboardCheck class="w-5 h-5" />
          تسوية المخزون
        </button>
        <button
          v-if="can('warehouse.transfer')"
          @click="$emit('stock-transfer')"
          class="px-4 py-2 bg-primary text-white rounded-lg text-label-md font-bold flex items-center gap-2 hover:bg-primary/90 transition-all active:scale-95 cursor-pointer"
        >
          <ArrowRightLeft class="w-5 h-5" />
          نقل مخزني
        </button>
      </div>
    </div>
    <div class="divide-y divide-outline-variant">
      <template v-for="(loc, idx) in locations" :key="idx">
        <!-- Internal Location -->
        <div
          v-if="loc.type === 'internal'"
          class="p-6 hover:bg-white-low transition-colors group"
        >
          <div class="flex justify-between items-start">
            <div class="flex gap-4">
              <div
                class="w-12 h-12 rounded-lg bg-white-high flex items-center justify-center text-primary group-hover:bg-primary-container/30 transition-colors"
              >
                <Store class="w-6 h-6" />
              </div>
              <div class="min-w-0">
                <h4
                  class="font-bold text-body-lg text-on-white flex items-center gap-2"
                >
                  <span
                    v-show="editingId === loc.id && editingField === 'name'"
                    class="inline-flex items-center gap-1"
                  >
                    <input
                      v-model="editValue"
                      @keydown="onKeydown($event, loc)"
                      @blur="saveEdit(loc)"
                      autofocus
                      class="h-8 w-48 bg-background border border-primary rounded px-2 text-sm font-mono text-on-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      @mousedown.prevent="saveEdit(loc)"
                      class="p-1 rounded hover:bg-white-high text-emerald-500"
                    >
                      <Check class="w-4 h-4" />
                    </button>
                    <button
                      @mousedown.prevent="cancelEdit"
                      class="p-1 rounded hover:bg-white-high text-red-500"
                    >
                      <X class="w-4 h-4" />
                    </button>
                  </span>
                  <span
                    v-show="!(editingId === loc.id && editingField === 'name')"
                    @dblclick="startEdit(loc, 'name')"
                    class="inline-flex items-center gap-1 cursor-pointer"
                  >
                    {{ loc.name }}
                    <Pencil
                      @click="startEdit(loc, 'name')"
                      class="w-3.5 h-3.5 text-on-white-variant opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                    />
                  </span>
                  <span
                    v-if="changingTypeId === loc.id"
                    class="inline-flex items-center"
                  >
                    <select
                      v-model="newType"
                      @change="changeType(loc)"
                      @blur="changingTypeId = null"
                      autofocus
                      class="h-7 text-xs rounded border border-outline-variant bg-white px-1 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      <option value="internal">مخزن</option>
                      <option value="view">مجلد هيكلي</option>
                      <option value="inventory">مخلفات</option>
                    </select>
                  </span>
                  <span
                    v-else
                    @click="newType = 'internal'; changingTypeId = loc.id"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-700 shrink-0 cursor-pointer hover:ring-2 hover:ring-sky-300"
                  >
                    مخزن
                  </span>
                </h4>
                <p
                  class="text-on-white-variant text-label-md flex items-center gap-1"
                >
                  <span
                    v-show="editingId === loc.id && editingField === 'address'"
                    class="inline-flex items-center gap-1"
                  >
                    <input
                      v-model="editValue"
                      @keydown="onKeydown($event, loc)"
                      @blur="saveEdit(loc)"
                      autofocus
                      class="h-8 w-48 bg-background border border-primary rounded px-2 text-sm font-mono text-on-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      @mousedown.prevent="saveEdit(loc)"
                      class="p-1 rounded hover:bg-white-high text-emerald-500"
                    >
                      <Check class="w-4 h-4" />
                    </button>
                    <button
                      @mousedown.prevent="cancelEdit"
                      class="p-1 rounded hover:bg-white-high text-red-500"
                    >
                      <X class="w-4 h-4" />
                    </button>
                  </span>
                  <span
                    v-show="
                      !(editingId === loc.id && editingField === 'address')
                    "
                    @dblclick="startEdit(loc, 'address')"
                    class="inline-flex items-center gap-1 cursor-pointer"
                  >
                    {{ loc.address }}
                    <Pencil
                      @click="startEdit(loc, 'address')"
                      class="w-3 h-3 text-on-white-variant opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                    />
                  </span>
                </p>
              </div>
            </div>
            <div class="text-left">
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2"
                :class="loc.statusColor"
              >
                {{ loc.status }}
              </span>
              <p class="text-price-display font-bold text-primary">
                {{ loc.qty }}
                <span class="text-body-md font-normal text-on-white-variant"
                  >قطعة</span
                >
              </p>
              <div
                v-if="loc.usedQty === 0 && can('warehouse.createLocation')"
                class="mt-2"
              >
                <button
                  v-if="confirmingDeleteId !== loc.id"
                  @click.stop="confirmingDeleteId = loc.id"
                  class="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                  حذف
                </button>
                <div
                  v-else
                  class="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                >
                  <span class="text-xs font-bold text-red-700"
                    >تأكيد الحذف؟</span
                  >
                  <button
                    @click.stop="deleteLocation(loc)"
                    :disabled="deleting"
                    class="px-2 py-1 text-xs font-bold bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                  >
                    حذف
                  </button>
                  <button
                    @click.stop="confirmingDeleteId = null"
                    :disabled="deleting"
                    class="px-2 py-1 text-xs font-bold bg-white border border-outline-variant rounded-md hover:bg-white-low disabled:opacity-50 cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            class="mt-4 w-full bg-white-high h-2 rounded-full overflow-hidden"
          >
            <div
              class="h-full rounded-full"
              :class="[loc.progressBarColor, loc.capacityWidth]"
            ></div>
          </div>
          <div
            class="flex justify-between mt-2 text-label-md text-on-white-variant"
          >
            <span>سعة التخزين المستهلكة</span>
            <span>
              <template v-if="loc.maxCapacity">
                {{ loc.usedQty?.toLocaleString("en-US") || loc.qty }} /
                {{ loc.maxCapacity.toLocaleString("en-US") }}
                قطعة ({{ loc.capacity }})
              </template>
              <template v-else>
                {{ loc.capacity }}
              </template>
            </span>
          </div>
        </div>

        <!-- View Folder -->
        <div
          v-else-if="loc.type === 'view'"
          class="p-6 hover:bg-white-low transition-colors group"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-100 transition-colors"
            >
              <FolderArchive class="w-6 h-6" />
            </div>
            <div class="flex-1 min-w-0">
              <h4
                class="font-bold text-body-lg text-on-white flex items-center gap-2"
              >
                <span
                  v-show="editingId === loc.id && editingField === 'name'"
                  class="inline-flex items-center gap-1"
                >
                  <input
                    v-model="editValue"
                    @keydown="onKeydown($event, loc)"
                    @blur="saveEdit(loc)"
                    autofocus
                    class="h-8 w-48 bg-background border border-primary rounded px-2 text-sm font-mono text-on-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    @mousedown.prevent="saveEdit(loc)"
                    class="p-1 rounded hover:bg-white-high text-emerald-500"
                  >
                    <Check class="w-4 h-4" />
                  </button>
                  <button
                    @mousedown.prevent="cancelEdit"
                    class="p-1 rounded hover:bg-white-high text-red-500"
                  >
                    <X class="w-4 h-4" />
                  </button>
                </span>
                <span
                  v-show="!(editingId === loc.id && editingField === 'name')"
                  @dblclick="startEdit(loc, 'name')"
                  class="inline-flex items-center gap-1 cursor-pointer"
                >
                  {{ loc.name }}
                  <Pencil
                    @click="startEdit(loc, 'name')"
                    class="w-3.5 h-3.5 text-on-white-variant opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                  />
                </span>
                <span
                  v-if="changingTypeId === loc.id"
                  class="inline-flex items-center gap-1"
                >
                  <select
                    v-model="newType"
                    @change="changeType(loc)"
                    @blur="changingTypeId = null"
                    autofocus
                    class="h-7 text-xs rounded border border-outline-variant bg-white px-1 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="internal">مخزن</option>
                    <option value="view">مجلد هيكلي</option>
                    <option value="inventory">مخلفات</option>
                  </select>
                </span>
                <span
                  v-else
                  @click="newType = 'view'; changingTypeId = loc.id"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 shrink-0 cursor-pointer hover:ring-2 hover:ring-amber-300"
                >
                  مجلد هيكلي
                </span>
              </h4>
              <p
                class="text-on-white-variant text-label-md flex items-center gap-1 truncate"
              >
                <span
                  v-show="editingId === loc.id && editingField === 'address'"
                  class="inline-flex items-center gap-1"
                >
                  <input
                    v-model="editValue"
                    @keydown="onKeydown($event, loc)"
                    @blur="saveEdit(loc)"
                    autofocus
                    class="h-8 w-48 bg-background border border-primary rounded px-2 text-sm font-mono text-on-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    @mousedown.prevent="saveEdit(loc)"
                    class="p-1 rounded hover:bg-white-high text-emerald-500"
                  >
                    <Check class="w-4 h-4" />
                  </button>
                  <button
                    @mousedown.prevent="cancelEdit"
                    class="p-1 rounded hover:bg-white-high text-red-500"
                  >
                    <X class="w-4 h-4" />
                  </button>
                </span>
                <span
                  v-show="!(editingId === loc.id && editingField === 'address')"
                  @dblclick="startEdit(loc, 'address')"
                  class="inline-flex items-center gap-1 cursor-pointer truncate"
                >
                  {{ loc.address }}
                  <Pencil
                    @click="startEdit(loc, 'address')"
                    class="w-3 h-3 text-on-white-variant opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                  />
                </span>
              </p>
            </div>
            <div class="text-xs text-on-white-variant shrink-0">
              <FolderArchive class="w-5 h-5 inline-block ml-1" />
              مجلد عرض
            </div>
          </div>
        </div>

        <!-- Scrap Location -->
        <div v-else class="p-6 hover:bg-white-low transition-colors group">
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center text-red-500 group-hover:bg-red-100 transition-colors"
            >
              <Trash2 class="w-6 h-6" />
            </div>
            <div class="flex-1 min-w-0">
              <h4
                class="font-bold text-body-lg text-on-white flex items-center gap-2"
              >
                <span
                  v-show="editingId === loc.id && editingField === 'name'"
                  class="inline-flex items-center gap-1"
                >
                  <input
                    v-model="editValue"
                    @keydown="onKeydown($event, loc)"
                    @blur="saveEdit(loc)"
                    autofocus
                    class="h-8 w-48 bg-background border border-primary rounded px-2 text-sm font-mono text-on-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    @mousedown.prevent="saveEdit(loc)"
                    class="p-1 rounded hover:bg-white-high text-emerald-500"
                  >
                    <Check class="w-4 h-4" />
                  </button>
                  <button
                    @mousedown.prevent="cancelEdit"
                    class="p-1 rounded hover:bg-white-high text-red-500"
                  >
                    <X class="w-4 h-4" />
                  </button>
                </span>
                <span
                  v-show="!(editingId === loc.id && editingField === 'name')"
                  @dblclick="startEdit(loc, 'name')"
                  class="inline-flex items-center gap-1 cursor-pointer"
                >
                  {{ loc.name }}
                  <Pencil
                    @click="startEdit(loc, 'name')"
                    class="w-3.5 h-3.5 text-on-white-variant opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                  />
                </span>
                <span
                  v-if="changingTypeId === loc.id"
                  class="inline-flex items-center gap-1"
                >
                  <select
                    v-model="newType"
                    @change="changeType(loc)"
                    @blur="changingTypeId = null"
                    autofocus
                    class="h-7 text-xs rounded border border-outline-variant bg-white px-1 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="internal">مخزن</option>
                    <option value="view">مجلد هيكلي</option>
                    <option value="inventory">مخلفات</option>
                  </select>
                </span>
                <span
                  v-else
                  @click="newType = 'inventory'; changingTypeId = loc.id"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-600 shrink-0 cursor-pointer hover:ring-2 hover:ring-red-300"
                >
                  مخلفات التصنيع / التصفي
                </span>
              </h4>
              <p
                class="text-on-white-variant text-label-md flex items-center gap-1 truncate"
              >
                <span
                  v-show="editingId === loc.id && editingField === 'address'"
                  class="inline-flex items-center gap-1"
                >
                  <input
                    v-model="editValue"
                    @keydown="onKeydown($event, loc)"
                    @blur="saveEdit(loc)"
                    autofocus
                    class="h-8 w-48 bg-background border border-primary rounded px-2 text-sm font-mono text-on-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    @mousedown.prevent="saveEdit(loc)"
                    class="p-1 rounded hover:bg-white-high text-emerald-500"
                  >
                    <Check class="w-4 h-4" />
                  </button>
                  <button
                    @mousedown.prevent="cancelEdit"
                    class="p-1 rounded hover:bg-white-high text-red-500"
                  >
                    <X class="w-4 h-4" />
                  </button>
                </span>
                <span
                  v-show="!(editingId === loc.id && editingField === 'address')"
                  @dblclick="startEdit(loc, 'address')"
                  class="inline-flex items-center gap-1 cursor-pointer truncate"
                >
                  {{ loc.address }}
                  <Pencil
                    @click="startEdit(loc, 'address')"
                    class="w-3 h-3 text-on-white-variant opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                  />
                </span>
              </p>
            </div>
            <div class="text-xs text-on-white-variant shrink-0">
              <Trash2 class="w-5 h-5 inline-block ml-1" />
              مخلفات التصنيع
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

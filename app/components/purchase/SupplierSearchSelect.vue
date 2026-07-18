<script setup lang="ts">
import { ref, watch } from "vue";
import { X, LoaderCircle, Plus } from "@lucide/vue";
import type { Supplier } from "~/types/purchase";

const modelValue = defineModel<Supplier | null>("supplier");
const props = defineProps<{
  selectedSupplier?: Supplier | null;
}>();

const emit = defineEmits<{
  (e: "create"): void;
}>();

const search = ref("");
const results = ref<Supplier[]>([]);
const isSearching = ref(false);
const showDropdown = ref(false);

let debounce: NodeJS.Timeout;

watch(search, (q) => {
  const clean = q.trim();
  if (!clean || modelValue.value) {
    results.value = [];
    showDropdown.value = false;
    return;
  }
  clearTimeout(debounce);
  debounce = setTimeout(async () => {
    isSearching.value = true;
    try {
      const res = await $fetch<{ success: boolean; data: Supplier[] }>(
        "/api/suppliers",
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

watch(
  () => props.selectedSupplier,
  () => {
    if (props.selectedSupplier) {
      modelValue.value = props.selectedSupplier;
      search.value = props.selectedSupplier.name;
    }
  },
  { immediate: true },
);

const select = (s: Supplier) => {
  modelValue.value = s;
  search.value = s.name;
  showDropdown.value = false;
  results.value = [];
};

const clear = () => {
  modelValue.value = null;
  search.value = "";
  showDropdown.value = false;
};
</script>

<template>
  <div class="space-y-1.5">
    <label class="text-label-md font-bold text-on-white-variant"
      >المورد *</label
    >
    <div class="relative">
      <div class="flex items-center gap-2">
        <button
          @click.prevent="emit('create')"
          class="shrink-0 w-11 h-11 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center justify-center cursor-pointer"
          title="إنشاء مورد"
        >
          <Plus class="w-5 h-5" />
        </button>
        <input
          v-model="search"
          :disabled="!!modelValue"
          class="flex-1 h-11 px-4 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white text-on-white disabled:bg-white-low"
          placeholder="ابحث عن مورد..."
          type="text"
        />
        <button
          v-if="modelValue"
          @click="clear"
          class="shrink-0 w-9 h-9 rounded-lg hover:bg-error/10 flex items-center justify-center text-error cursor-pointer"
          title="إزالة المورد"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
      <div
        v-if="showDropdown && results.length > 0"
        class="absolute z-10 mt-1 w-full bg-white border border-outline-variant rounded-xl shadow-lg max-h-48 overflow-y-auto"
      >
        <button
          v-for="s in results"
          :key="s.id"
          @click="select(s)"
          class="w-full text-right px-4 py-3 hover:bg-primary/5 text-body-md font-bold cursor-pointer border-b border-outline-variant/30 last:border-0"
        >
          {{ s.name }}
        </button>
      </div>
      <div v-if="isSearching" class="absolute left-3 top-1/2 -translate-y-1/2">
        <LoaderCircle class="w-4 h-4 animate-spin text-on-white-variant" />
      </div>
    </div>
  </div>
</template>

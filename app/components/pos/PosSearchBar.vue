<script setup lang="ts">
import { ref, watch, watchEffect, onMounted, onUnmounted, nextTick } from "vue";
import { Search, X, Plus, Package } from "@lucide/vue";
import BarcodeScanner from "./BarcodeScanner.vue";
import type { POSProduct } from "~/types/pos";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    scannerActive?: boolean;
    suggestions?: POSProduct[];
    loading?: boolean;
  }>(),
  { scannerActive: false, suggestions: () => [], loading: false },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  "update:scannerActive": [value: boolean];
  scan: [barcode: string];
  error: [message: string];
  "add-to-cart": [product: POSProduct];
}>();

const localValue = ref(props.modelValue);
const showDropdown = ref(false);
const dismissed = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);
const dropdownStyle = ref({ top: "0px", left: "0px", width: "0px" });

watch(
  () => props.modelValue,
  (v) => {
    localValue.value = v;
  },
);

watch(localValue, () => {
  dismissed.value = false;
});

watchEffect(() => {
  const hasInput = localValue.value.length > 0;
  const hasContent = props.suggestions.length > 0 || props.loading;
  if (hasInput && hasContent && !dismissed.value) {
    showDropdown.value = true;
  } else if (!hasInput) {
    showDropdown.value = false;
    dismissed.value = false;
  }
});

watch(showDropdown, (show) => {
  if (show && inputRef.value) {
    const rect = inputRef.value.getBoundingClientRect();
    dropdownStyle.value = {
      top: `${rect.bottom + 4}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
    };
  }
});

watch(() => props.suggestions, (suggestions) => {
  if (suggestions.length === 1 && localValue.value && inputRef.value === document.activeElement) {
    selectProduct(suggestions[0]);
    nextTick(() => inputRef.value?.focus());
  }
});

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value;
  localValue.value = val;
  emit("update:modelValue", val);
}

function clear() {
  localValue.value = "";
  showDropdown.value = false;
  dismissed.value = true;
  emit("update:modelValue", "");
}

function handleScan(barcode: string) {
  localValue.value = barcode;
  showDropdown.value = false;
  dismissed.value = true;
  emit("scan", barcode);
}

function toggleScanner() {
  emit("update:scannerActive", !props.scannerActive);
}

function selectProduct(product: POSProduct) {
  showDropdown.value = false;
  dismissed.value = true;
  localValue.value = "";
  emit("update:modelValue", "");
  emit("add-to-cart", product);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    showDropdown.value = false;
    dismissed.value = true;
  }
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (
    !target.closest(".search-bar-container") &&
    !target.closest(".search-suggestions-dropdown")
  ) {
    showDropdown.value = false;
    dismissed.value = true;
  }
}

onMounted(() => {
  document.addEventListener("click", onClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", onClickOutside);
});

const totalStock = (product: POSProduct) => {
  if (!product.stock_by_location?.length) {
    return product.qty_available || 0;
  }
  return product.stock_by_location.reduce((s, l) => s + l.quantity, 0);
};
</script>

<template>
  <div class="search-bar-container relative w-full">
    <div class="flex items-center gap-2 w-full">
      <div class="relative flex-1">
        <Search
          class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4"
        />
        <input
          ref="inputRef"
          :value="localValue"
          @input="onInput"
          @keydown="handleKeydown"
          @focus="dismissed = false"
          :placeholder="
            scannerActive ? 'ماسح الباركود نشط...' : 'بحث بالاسم أو الباركود...'
          "
          class="w-full h-10 pr-9 pl-9 bg-muted/50 border border-outline-variant/60 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        <button
          v-if="localValue"
          @click="clear"
          class="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
      <button
        @click="toggleScanner"
        class="shrink-0 h-10 w-10 flex items-center justify-center rounded-lg border border-outline-variant/60 hover:bg-muted/80 transition-all cursor-pointer"
        :class="{
          'bg-primary/10 border-primary/30 text-primary': scannerActive,
        }"
        title="ماسح الباركود"
      >
        <span class="material-symbols-outlined text-lg">qr_code_scanner</span>
      </button>
      <div
        v-if="scannerActive"
        class="absolute top-14 left-0 right-0 z-50 max-w-md mx-auto"
      >
        <BarcodeScanner
          :active="scannerActive"
          @scan="handleScan"
          @update:active="(v) => emit('update:scannerActive', v)"
          @error="(msg) => emit('error', msg)"
        />
      </div>
    </div>

    <!-- Suggestions Dropdown - using fixed positioning to avoid parent overflow clipping -->
    <Teleport to="body">
      <div
        v-if="showDropdown"
        class="search-suggestions-dropdown fixed z-[9999] bg-card border border-outline-variant/60 rounded-xl shadow-xl overflow-hidden max-h-80 overflow-y-auto"
        :style="dropdownStyle"
      >
        <div
          v-if="loading"
          class="p-4 text-center text-sm text-muted-foreground"
        >
          جاري البحث...
        </div>
        <div
          v-else-if="!loading && localValue && suggestions.length === 0"
          class="p-4 text-center text-sm text-muted-foreground"
        >
          لا توجد نتائج لـ "{{ localValue }}"
        </div>
        <div v-else>
          <button
            v-for="product in suggestions"
            :key="product.id"
            @click="selectProduct(product)"
            class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-right border-b border-outline-variant/20 last:border-b-0 cursor-pointer"
          >
            <div
              class="w-10 h-10 rounded-lg bg-muted/30 border border-outline-variant/40 flex items-center justify-center overflow-hidden shrink-0"
            >
              <img
                v-if="product.image_1920"
                :src="`data:image/png;base64,${product.image_1920}`"
                class="w-full h-full object-cover"
              />
              <Package v-else class="w-5 h-5 text-muted-foreground/40" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate">
                {{ product.display_name || product.name }}
              </p>
              <p class="text-[11px] text-muted-foreground">
                {{ product.barcode || "—" }}
              </p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-sm font-bold text-primary">
                {{
                  (product.list_price || 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })
                }}
                ج.م
              </p>
              <p
                class="text-[10px]"
                :class="
                  totalStock(product) <= 0
                    ? 'text-destructive'
                    : 'text-emerald-600'
                "
              >
                {{
                  totalStock(product) <= 0
                    ? "نفذ"
                    : `${totalStock(product)} متوفر`
                }}
              </p>
            </div>
            <div class="shrink-0">
              <span
                class="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus class="w-4 h-4" />
              </span>
            </div>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

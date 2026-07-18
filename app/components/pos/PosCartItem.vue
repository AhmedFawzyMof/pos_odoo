<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { Minus, Plus, Trash2 } from "@lucide/vue";
import type { CartItem } from "~/types/pos";
import { useNumberFormat } from "~/composables/useNumberFormat";

const props = defineProps<{
  item: CartItem;
  isSelected?: boolean;
}>();

const emit = defineEmits<{
  updateQuantity: [quantity: number];
  remove: [];
}>();

const { formatNumber } = useNumberFormat();

const localQty = ref(props.item.quantity);
watch(() => props.item.quantity, (newQty) => {
  localQty.value = newQty;
});
const isWeight = computed(() => props.item.product.to_weight);
const step = computed(() => (isWeight.value ? 0.01 : 1));
const min = computed(() => (isWeight.value ? 0.01 : 1));

const lineTotal = computed(() => {
  const total = props.item.price * localQty.value;
  const discount = props.item.discount || 0;
  return total - discount;
});

const taxes = computed(() => props.item.product.taxes || []);

const isTaxable = computed(() => taxes.value.length > 0);

const taxLabel = computed(() => {
  if (taxes.value.length === 1) return taxes.value[0]?.name || "خاضع للضريبة";
  if (taxes.value.length > 1) return "خاضع للضريبة";
  return "";
});

const taxAmount = computed(() => {
  if (!isTaxable.value) return 0;
  const base = props.item.price * localQty.value - (props.item.discount || 0);
  return taxes.value.reduce((sum, tax) => sum + base * (tax.amount / 100), 0);
});

function increment() {
  localQty.value = Math.round((localQty.value + step.value) * 100) / 100;
  emit("updateQuantity", localQty.value);
}

function decrement() {
  if (localQty.value > min.value) {
    localQty.value = Math.round((localQty.value - step.value) * 100) / 100;
    emit("updateQuantity", localQty.value);
  }
}

function onInput(e: Event) {
  const target = e.target as HTMLInputElement;
  const val = parseFloat(target.value);
  if (!isNaN(val) && val >= min.value) {
    localQty.value = Math.round(val * 100) / 100;
    emit("updateQuantity", localQty.value);
  }
}
</script>

<template>
  <div
    class="flex items-start gap-3 py-3 border-b border-outline-variant/20 last:border-0 rounded-lg transition-all duration-150"
    :class="isSelected ? 'ring-2 ring-primary ring-offset-1 bg-primary/5 -mx-2 px-2' : ''"
  >
    <div class="flex-1 min-w-0 space-y-1">
      <h4 class="text-sm font-semibold leading-tight truncate">
        {{ item.product.display_name || item.product.name }}
      </h4>
      <p v-if="item.variant && item.variant.display_name !== (item.product.display_name || item.product.name)" class="text-[11px] text-muted-foreground">
        {{ item.variant.attribute_values?.map(v => v.value_name).join(' / ') || item.variant.display_name }}
      </p>
      <p class="text-xs text-muted-foreground">
        {{ formatNumber(item.price) }} ج.م
      </p>
      <p v-if="isTaxable" class="text-[10px] text-warning font-medium flex items-center gap-1">
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-warning"></span>
        {{ taxLabel }}: {{ formatNumber(taxAmount) }} ج.م
      </p>
      <div class="flex items-center gap-2 mt-1.5">
        <button
          @click="decrement"
          class="h-7 w-7 rounded-full border border-outline-variant/50 flex items-center justify-center hover:bg-muted/70 transition-colors cursor-pointer shrink-0"
        >
          <Minus class="w-3.5 h-3.5" />
        </button>
        <input
          v-if="isWeight"
          type="number"
          :value="localQty"
          @input="onInput"
          step="0.01"
          min="0.01"
          class="w-16 text-sm font-bold tabular-nums text-center bg-transparent border border-outline-variant/50 rounded-md px-1 py-0.5"
        />
        <span v-else class="text-sm font-bold tabular-nums w-6 text-center">{{ localQty }}</span>
        <button
          @click="increment"
          class="h-7 w-7 rounded-full border border-outline-variant/50 flex items-center justify-center hover:bg-muted/70 transition-colors cursor-pointer shrink-0"
        >
          <Plus class="w-3.5 h-3.5" />
        </button>
        <span v-if="isWeight" class="text-xs text-muted-foreground">كجم</span>
      </div>
    </div>
    <div class="flex flex-col items-end gap-1 shrink-0">
      <span class="text-sm font-bold tabular-nums">
        {{ formatNumber(lineTotal) }}
      </span>
      <button
        @click="emit('remove')"
        class="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
      >
        <Trash2 class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

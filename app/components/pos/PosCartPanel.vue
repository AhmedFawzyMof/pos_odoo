<script setup lang="ts">
import { computed } from "vue";
import { ShoppingCart, Trash2, Receipt } from "@lucide/vue";
import Skeleton from "@/components/ui/skeleton/Skeleton.vue";
import { Button } from "@/components/ui/button";
import PosCartItem from "./PosCartItem.vue";
import { usePosCartStore } from "~~/stores/pos-cart";
import { useNumberFormat } from "~/composables/useNumberFormat";

const props = withDefaults(defineProps<{
  bordered?: boolean;
  selectedIndex?: number;
  loading?: boolean;
}>(), {
  bordered: true,
  selectedIndex: -1,
  loading: false,
});

const emit = defineEmits<{
  checkout: [];
  selectItem: [index: number];
}>();

const cart = usePosCartStore();

const { formatNumber } = useNumberFormat();

const isEmpty = computed(() => cart.items.length === 0);
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0 bg-card" :class="bordered ? 'border-r border-outline-variant/40' : ''">
    <div class="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
      <div class="flex items-center gap-2">
        <ShoppingCart class="w-5 h-5 text-primary" />
        <h3 class="font-bold text-sm">الفواتير</h3>
        <span
          v-if="cart.itemCount > 0"
          class="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none"
        >
          {{ cart.itemCount }}
        </span>
      </div>
      <button
        v-if="!isEmpty"
        @click="cart.clearCart()"
        class="text-muted-foreground hover:text-destructive transition-colors text-xs flex items-center gap-1 cursor-pointer"
      >
        <Trash2 class="w-3.5 h-3.5" />
        تفريغ
      </button>
    </div>

    <div class="flex-1 overflow-y-auto px-4 py-2 space-y-0">
      <div
        v-if="isEmpty && !loading"
        class="flex flex-col items-center justify-center h-full text-muted-foreground"
      >
        <span class="material-symbols-outlined text-5xl text-muted-foreground/30">shopping_cart</span>
        <p class="text-sm mt-2">الفواتير فارغة</p>
        <p class="text-xs mt-1">اختر المنتجات من الكتالوج</p>
      </div>
      <div v-else-if="isEmpty && loading" class="space-y-2 px-2 py-4">
        <div
          v-for="i in 3"
          :key="i"
          class="flex items-center gap-3 p-3 rounded-xl"
        >
          <Skeleton class="w-10 h-10 rounded-lg shrink-0" />
          <div class="flex-1 space-y-2">
            <Skeleton class="h-3 w-3/4" />
            <Skeleton class="h-3 w-1/3" />
          </div>
          <Skeleton class="h-8 w-20 rounded-lg" />
        </div>
      </div>
      <PosCartItem
        v-for="(item, index) in cart.items"
        :key="item.variant?.id || item.product.id"
        :item="item"
        :is-selected="index === selectedIndex"
        class="cursor-pointer select-none"
        @click="emit('selectItem', index)"
        @update-quantity="(q) => cart.updateQuantity(item.product.id, q, item.variant?.id)"
        @remove="cart.removeItem(item.product.id, item.variant?.id)"
      />
    </div>

    <div class="border-t border-outline-variant/20 px-4 py-4 space-y-3">
      <div class="space-y-1.5 text-sm">
        <div class="flex justify-between text-muted-foreground">
          <span>الإجمالي قبل الضريبة</span>
          <span class="tabular-nums font-medium">
            {{ formatNumber(cart.subtotal) }} ج.م
          </span>
        </div>
        <div v-if="cart.totalTax > 0" class="flex justify-between text-warning text-sm">
          <span>الضريبة (14%)</span>
          <span class="tabular-nums font-medium">
            {{ formatNumber(cart.totalTax) }} ج.م
          </span>
        </div>
        <div class="flex justify-between text-base font-bold pt-1 border-t border-outline-variant/20">
          <span>الإجمالي</span>
          <span class="tabular-nums text-primary">
            {{ formatNumber(cart.grandTotal) }} ج.م
          </span>
        </div>
      </div>

      <Button
        class="w-full gap-2 cursor-pointer"
        :disabled="isEmpty"
        size="lg"
        @click="emit('checkout')"
      >
        <Receipt class="w-4 h-4" />
        إتمام الطلب
      </Button>
    </div>
  </div>
</template>

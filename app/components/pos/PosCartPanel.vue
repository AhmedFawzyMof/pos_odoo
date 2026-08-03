<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import {
  ShoppingCart,
  Trash2,
  Banknote,
  Percent,
  CreditCard,
  MessageSquareText,
  Users,
  Truck,
} from "@lucide/vue";
import Skeleton from "@/components/ui/skeleton/Skeleton.vue";
import { Button } from "@/components/ui/button";
import PosCartItem from "./PosCartItem.vue";
import { usePosCartStore } from "~~/stores/pos-cart";
import { useNumberFormat } from "~/composables/useNumberFormat";
import { useDb } from "~/composables/useDb";

const props = withDefaults(
  defineProps<{
    bordered?: boolean;
    selectedIndex?: number;
    loading?: boolean;
    hasSession?: boolean;
    processing?: boolean;
  }>(),
  {
    bordered: true,
    selectedIndex: -1,
    loading: false,
    hasSession: true,
    processing: false,
  },
);

const emit = defineEmits<{
  payCash: [];
  showPaymentMethods: [];
  showNotes: [];
  showDiscount: [];
  openClients: [];
  showDelivery: [];
  selectItem: [index: number];
}>();

const cart = usePosCartStore();

const { formatNumber } = useNumberFormat();

const db = useDb();

function switchDb(name: string) {
  sessionStorage.setItem("_db_switch", "1");
  document.cookie = `odoo_db=${name}; path=/; max-age=${60 * 60 * 24 * 365}`;
  window.location.reload();
}

const isEmpty = computed(() => cart.items.length === 0);

const cartListRef = ref<HTMLElement | null>(null);
const isAtBottom = ref(true);

function handleScroll() {
  const el = cartListRef.value;
  if (!el) return;
  isAtBottom.value = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
}

watch(
  () => cart.items,
  () => {
    if (isAtBottom.value) {
      nextTick(() => {
        const el = cartListRef.value;
        if (el) {
          el.scrollTop = el.scrollHeight;
        }
      });
    }
  },
  { deep: true },
);
</script>

<template>
  <div
    class="flex flex-col flex-1 min-h-0 bg-card"
    :class="bordered ? 'border-r border-outline-variant/40' : ''"
  >
    <div
      class="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20"
    >
      <div class="flex items-center gap-2">
        <div class="">
          <span class="text-xs text-blue-500 font-bold">{{
            cart.customerName
          }}</span>
          <Button
            @click="emit('openClients')"
            class="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors hover:bg-accent"
          >
            <Users class="w-5 h-5" />
            <span class="font-bold text-sm">العملاء</span>
          </Button>
          <select
            :value="db.currentDb.value"
            @change="switchDb(($event.target as HTMLSelectElement).value)"
            class="text-xs bg-transparent border border-outline-variant/30 rounded-lg px-2 py-1 text-muted-foreground cursor-pointer focus:outline-none"
          >
            <option
              v-for="dbName in db.availableDatabases"
              :key="dbName"
              :value="dbName"
            >
              {{ dbName === 'eldokanh_one' ? 'الفرع الثاني' : 'الفرع الرئيسي' }}
            </option>
          </select>
        </div>
        <span
          v-if="cart.itemCount > 0"
          class="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-4.5 text-center leading-none"
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

    <div
      ref="cartListRef"
      class="flex-1 overflow-y-auto px-4 py-2 space-y-0"
      @scroll.passive="handleScroll"
    >
      <div
        v-if="isEmpty && !loading"
        class="flex flex-col items-center justify-center h-full text-muted-foreground"
      >
        <span
          class="material-symbols-outlined text-5xl text-muted-foreground/30"
          >shopping_cart</span
        >
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
        @update-quantity="
          (q) => cart.updateQuantity(item.product.id, q, item.variant?.id)
        "
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
        <div
          v-if="cart.totalTax > 0"
          class="flex justify-between text-warning text-sm"
        >
          <span>الضريبة (14%)</span>
          <span class="tabular-nums font-medium">
            {{ formatNumber(cart.totalTax) }} ج.م
          </span>
        </div>
        <div
          v-if="cart.discountAmount > 0"
          class="flex justify-between text-red-500 text-sm"
        >
          <span>الخصم</span>
          <span class="tabular-nums font-medium">
            -{{ formatNumber(cart.discountAmount) }} ج.م
          </span>
        </div>
        <div
          v-if="cart.serviceFeeAmount > 0"
          class="flex justify-between text-amber-600 text-sm"
        >
          <span>رسوم إضافية</span>
          <span class="tabular-nums font-medium">
            +{{ formatNumber(cart.serviceFeeAmount) }} ج.م
          </span>
        </div>
        <div
          v-if="cart.deliveryCost > 0"
          class="flex justify-between text-primary text-sm"
        >
          <span>رسوم التوصيل</span>
          <span class="tabular-nums font-medium">
            +{{ formatNumber(cart.deliveryCost) }} ج.م
          </span>
        </div>
        <div
          v-if="cart.deliveryDriverName"
          class="flex justify-between text-xs text-on-white-variant"
        >
          <span>السائق</span>
          <span class="font-medium">{{ cart.deliveryDriverName }}</span>
        </div>
        <div
          class="flex justify-between text-base font-bold pt-1 border-t border-outline-variant/20"
        >
          <span>الإجمالي</span>
          <span class="tabular-nums text-primary">
            {{ formatNumber(cart.grandTotal) }} ج.م
          </span>
        </div>
      </div>

      <div class="flex flex-col md:flex-row items-center gap-2">
        <Button
          class="w-full md:flex-1 md:w-auto gap-2 cursor-pointer"
          :disabled="isEmpty || !hasSession || processing"
          size="default"
          @click="emit('payCash')"
        >
          <Banknote class="w-4 h-4" />
          {{ processing ? "جاري..." : "نقدي" }}
        </Button>
        <Button
          class="w-full md:flex-1 md:w-auto gap-2 cursor-pointer"
          :disabled="isEmpty"
          size="default"
          @click="emit('showPaymentMethods')"
        >
          <CreditCard class="w-4 h-4" />
          طرق الدفع
        </Button>
        <Button
          variant="outline"
          class="w-full md:flex-1 md:w-auto gap-2 cursor-pointer"
          :class="
            cart.deliveryCost > 0 || cart.deliveryDriverName
              ? 'border-primary/50 text-primary hover:bg-primary/5'
              : ''
          "
          :disabled="isEmpty"
          size="default"
          @click="emit('showDelivery')"
        >
          <Truck class="w-4 h-4" />
          <span>توصيل</span>
          <span
            v-if="cart.deliveryCost > 0 || cart.deliveryDriverName"
            class="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
          >
            ✓
          </span>
        </Button>
        <Button
          variant="outline"
          class="w-full md:flex-1 md:w-auto gap-2 cursor-pointer"
          :disabled="isEmpty"
          size="default"
          @click="emit('showNotes')"
        >
          <MessageSquareText class="w-4 h-4" />
          ملاحظات
          <span
            v-if="cart.note"
            class="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
          >
            !
          </span>
        </Button>
        <Button
          variant="outline"
          class="w-full md:flex-1 md:w-auto gap-2 cursor-pointer"
          :class="
            cart.orderDiscount > 0
              ? 'border-red-300 text-red-600 hover:bg-red-50'
              : ''
          "
          :disabled="isEmpty"
          size="default"
          @click="emit('showDiscount')"
        >
          <Percent class="w-4 h-4" />
          <span>خصم</span>
          <span v-if="cart.orderDiscount > 0" class="text-xs font-bold">
            ({{
              cart.orderDiscountType === "percent"
                ? `${cart.orderDiscount}%`
                : `${formatNumber(cart.orderDiscount)} ج.م`
            }})
          </span>
        </Button>
      </div>
    </div>
  </div>
</template>

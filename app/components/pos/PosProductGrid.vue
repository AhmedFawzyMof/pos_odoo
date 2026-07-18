<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { LoaderCircle } from "@lucide/vue";
import Skeleton from "@/components/ui/skeleton/Skeleton.vue";
import PosProductCard from "./PosProductCard.vue";
import type { POSProduct } from "~/types/pos";

const props = defineProps<{
  products: POSProduct[];
  loading: boolean;
  hasMore: boolean;
  error?: string;
  selectedLocationId?: number | null;
  allowOutOfStockSale?: boolean;
}>();

const emit = defineEmits<{
  loadMore: [];
  productClick: [product: POSProduct];
  addToCart: [product: POSProduct];
}>();

const gridRef = ref<HTMLElement | null>(null);

const observer = ref<IntersectionObserver | null>(null);
const sentinelRef = ref<HTMLElement | null>(null);

onMounted(() => {
  if (typeof IntersectionObserver === "undefined") return;

  observer.value = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && props.hasMore && !props.loading) {
        emit("loadMore");
      }
    },
    { rootMargin: "200px" },
  );

  if (sentinelRef.value) {
    observer.value.observe(sentinelRef.value);
  }
});

watch(
  () => props.products.length,
  () => {
    if (observer.value && sentinelRef.value) {
      observer.value.unobserve(sentinelRef.value);
      observer.value.observe(sentinelRef.value);
    }
  },
);
</script>

<template>
  <div ref="gridRef" class="space-y-4">
    <div
      v-if="loading && products.length === 0"
      class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
    >
      <div
        v-for="i in 12"
        :key="i"
        class="bg-card border border-outline-variant/40 rounded-xl overflow-hidden flex flex-col"
      >
        <Skeleton class="aspect-square rounded-none" />
        <div class="p-2.5 space-y-2">
          <Skeleton class="h-3 w-3/4" />
          <Skeleton class="h-2.5 w-1/2" />
          <div class="flex items-center justify-between pt-1">
            <Skeleton class="h-4 w-16" />
            <Skeleton class="h-8 w-8 rounded-lg" />
          </div>
        </div>
      </div>
    </div>

    <div
      v-else-if="!loading && products.length === 0"
      class="flex items-center justify-center py-20 text-muted-foreground"
    >
      <div class="text-center space-y-2">
        <span class="material-symbols-outlined text-5xl text-muted-foreground/30">search_off</span>
        <p class="text-sm">لا توجد منتجات تطابق هذا البحث</p>
      </div>
    </div>

    <template v-else>
      <div
        class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
      >
        <PosProductCard
          v-for="product in products"
          :key="product.id"
          :product="product"
          :selected-location-id="selectedLocationId"
          :allow-out-of-stock-sale="allowOutOfStockSale"
          @click="emit('productClick', product)"
          @add-to-cart="emit('addToCart', product)"
        />
      </div>

      <div ref="sentinelRef" class="h-4" />

      <div
        v-if="loading"
        class="flex items-center justify-center py-6"
      >
        <LoaderCircle class="w-6 h-6 animate-spin text-primary" />
      </div>

      <div
        v-if="!hasMore && products.length > 0"
        class="text-center py-4 text-xs text-muted-foreground"
      >
        تم عرض جميع المنتجات
      </div>
    </template>
  </div>
</template>

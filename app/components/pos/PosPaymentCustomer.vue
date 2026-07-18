<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { X, Plus } from "@lucide/vue";
import { usePosCartStore } from "~~/stores/pos-cart";
import type { Customer } from "~/types/customer";

const props = defineProps<{
  autoExpand?: boolean;
}>();

const cart = usePosCartStore();

const show = ref(false);
const customerSearchQuery = ref("");
const customers = ref<Customer[]>([]);
const loadingCustomers = ref(false);
const showCustomerDrawer = ref(false);
const customerDrawerSaving = ref(false);
const customerDrawerError = ref("");
let searchCustomerDebounce: NodeJS.Timeout;

async function fetchCustomers(search = "") {
  loadingCustomers.value = true;
  try {
    const res = await $fetch<any>("/api/customers", {
      params: { page: "1", search, type: "الكل" },
    });
    customers.value = res?.data || [];
  } catch {
    customers.value = [];
  } finally {
    loadingCustomers.value = false;
  }
}

function onCustomerSearch(val: string) {
  clearTimeout(searchCustomerDebounce);
  searchCustomerDebounce = setTimeout(() => fetchCustomers(val), 300);
}

function selectCustomer(customer: Customer) {
  cart.customerId = customer.id;
  show.value = false;
}

function clearCustomer() {
  cart.customerId = null;
}

async function saveCustomer(payload: Record<string, any>) {
  customerDrawerSaving.value = true;
  customerDrawerError.value = "";
  try {
    const res = await $fetch<{ success: boolean; id: number }>(
      "/api/customers/save",
      {
        method: "POST",
        body: payload,
      },
    );
    if (res.success) {
      showCustomerDrawer.value = false;
      customerDrawerError.value = "";
      await fetchCustomers(customerSearchQuery.value);
      const newCustomer = customers.value.find((c) => c.id === res.id);
      if (newCustomer) selectCustomer(newCustomer);
    }
  } catch (err: any) {
    customerDrawerError.value =
      err.message || err.statusMessage || "خطأ في الاتصال";
  } finally {
    customerDrawerSaving.value = false;
  }
}

watch(
  () => props.autoExpand,
  (val) => {
    if (val) {
      show.value = true;
      nextTick(() => {
        const input = document.querySelector<HTMLInputElement>(
          '[placeholder="بحث عن عميل..."]',
        );
        input?.focus();
      });
    }
  },
  { immediate: true },
);

fetchCustomers();
</script>

<template>
  <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
    <button
      @click="show = !show"
      class="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
    >
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span>العميل</span>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="cart.customerId && !show" class="text-xs text-purple-600 font-medium">
          {{ customers.find((c) => c.id === cart.customerId)?.name }}
        </span>
        <button v-if="cart.customerId && !show" @click.stop="clearCustomer" class="text-red-400 hover:text-red-600 cursor-pointer">
          <X class="w-3.5 h-3.5" />
        </button>
        <span v-else class="text-xs text-slate-400">{{ show ? "إخفاء" : "اختيار" }}</span>
      </div>
    </button>
    <div v-if="show" class="px-4 pb-4 space-y-3">
      <div class="flex items-center gap-2">
        <input
          v-model="customerSearchQuery"
          @input="onCustomerSearch(customerSearchQuery)"
          placeholder="بحث عن عميل..."
          class="flex-1 h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
        />
        <button
          @click="showCustomerDrawer = true"
          class="shrink-0 w-10 h-10 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors cursor-pointer"
          title="إضافة عميل جديد"
        >
          <Plus class="w-5 h-5" />
        </button>
      </div>
      <div v-if="loadingCustomers" class="text-center text-xs text-slate-400 py-4">
        جاري التحميل...
      </div>
      <div v-else-if="customers.length === 0" class="text-center py-4">
        <p class="text-xs text-slate-400 mb-2">لا يوجد عملاء</p>
        <button
          @click="showCustomerDrawer = true"
          class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
        >
          + إضافة عميل جديد
        </button>
      </div>
      <div v-else class="max-h-40 overflow-y-auto space-y-1">
        <button
          v-for="customer in customers"
          :key="customer.id"
          @click="selectCustomer(customer)"
          :class="[
            'w-full text-right px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer',
            cart.customerId === customer.id
              ? 'bg-purple-100 text-purple-700'
              : 'hover:bg-slate-100 text-slate-700',
          ]"
        >
            <div class="flex items-center justify-between w-full">
              <span>{{ customer.name }}</span>
              <span class="text-slate-400 text-[10px]" dir="ltr">{{ customer.phone }}</span>
            </div>
        </button>
      </div>
    </div>
  </div>

  <CustomersCustomerDrawer
    v-model:isOpen="showCustomerDrawer"
    mode="add"
    :customer="null"
    :is-saving="customerDrawerSaving"
    :action-error="customerDrawerError"
    @save="saveCustomer"
    @update:actionError="customerDrawerError = $event"
  />
</template>

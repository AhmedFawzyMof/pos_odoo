<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Keyboard } from "@lucide/vue";

const expanded = ref(false);
const STORAGE_KEY = "pos_hotkey_help_collapsed";

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "true") expanded.value = false;
  else expanded.value = true;
});

function toggle() {
  expanded.value = !expanded.value;
  localStorage.setItem(STORAGE_KEY, String(!expanded.value));
}

const shortcuts = [
  {
    group: "المدفوعات",
    keys: [
      { label: "نقدي", keys: ["F1"] },
      { label: "بطاقة", keys: ["F2"] },
    ],
  },
  {
    group: "الفاتورة",
    keys: [
      { label: "خصم", keys: ["F3"] },
      { label: "عميل", keys: ["F4"] },
      { label: "تعليق", keys: ["F5"] },
    ],
  },
  {
    group: "الجلسة",
    keys: [{ label: "إغلاق", keys: ["F12"] }],
  },
  {
    group: "السلة (عند التحديد)",
    keys: [
      { label: "تحريك", keys: ["↑", "↓"] },
      { label: "زيادة", keys: ["+"] },
      { label: "نقص", keys: ["-"] },
      { label: "حذف", keys: ["Del"] },
    ],
  },
];
</script>

<template>
  <div class="fixed top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
    <div class="pointer-events-auto">
      <button
        @click="toggle"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-sm border border-outline-variant/30 shadow-sm text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <Keyboard class="w-3.5 h-3.5" />
        <span class="font-medium">{{ expanded ? "إخفاء" : "اختصارات" }}</span>
      </button>

      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div
          v-if="expanded"
          class="mt-2 bg-card/95 backdrop-blur-md border border-outline-variant/20 rounded-xl shadow-xl p-4 w-72 max-h-[70vh] overflow-y-auto text-right"
        >
          <div
            v-for="(section, i) in shortcuts"
            :key="i"
            class="mb-3 last:mb-0"
          >
            <h4 class="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">
              {{ section.group }}
            </h4>
            <div class="space-y-1.5">
              <div
                v-for="(item, j) in section.keys"
                :key="j"
                class="flex items-center justify-between text-xs"
              >
                <div class="flex items-center gap-1">
                  <kbd
                    v-for="(k, idx) in item.keys"
                    :key="idx"
                    class="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-md bg-muted border border-outline-variant/30 text-[10px] font-mono font-bold text-foreground shadow-xs"
                  >
                    {{ k }}
                  </kbd>
                </div>
                <span class="text-muted-foreground">{{ item.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

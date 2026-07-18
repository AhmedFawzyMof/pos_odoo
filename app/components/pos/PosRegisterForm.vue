<script setup lang="ts">
import { ref } from "vue";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "@lucide/vue";

defineProps<{
  show: boolean;
  loading: boolean;
}>();

const emit = defineEmits<{
  create: [name: string];
  close: [];
}>();

const registerName = ref("");
</script>

<template>
  <div
    v-if="show"
    class="max-w-md bg-card border border-primary/20 rounded-xl p-5 shadow-sm space-y-4"
  >
    <div class="space-y-1">
      <h3 class="text-sm font-bold">تسجيل محطة عمل جديدة</h3>
      <p class="text-xs text-muted-foreground">
        سيقوم النظام بإنشاء ملف إعدادات متكامل مع دفاتر اليومية الافتراضية
        تلقائياً.
      </p>
    </div>
    <form
      @submit.prevent="emit('create', registerName.trim())"
      class="flex items-end gap-3"
    >
      <div class="flex-1 space-y-1.5">
        <Label
          for="new-reg-name"
          class="text-xs text-muted-foreground font-semibold"
        >
          اسم نقطة البيع
        </Label>
        <Input
          id="new-reg-name"
          v-model="registerName"
          placeholder="مثال: كاشير فرع المعادي 2"
          required
        />
      </div>
      <Button type="submit" class="h-10" :disabled="loading">
        <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
        <span v-else>حفظ الجهاز</span>
      </Button>
    </form>
  </div>
</template>

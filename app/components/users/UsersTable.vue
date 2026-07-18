<script setup lang="ts">
import { Pencil, Trash2 } from "@lucide/vue"

defineProps<{
  users: any[]
  loading: boolean
}>()

const emit = defineEmits<{
  edit: [user: any]
  delete: [user: any]
}>()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-border text-muted-foreground text-xs">
          <th class="text-right py-3 px-4 font-medium">الاسم</th>
          <th class="text-right py-3 px-4 font-medium">البريد الإلكتروني</th>
          <th class="text-right py-3 px-4 font-medium">المجموعات</th>
          <th class="text-right py-3 px-4 font-medium">الحالة</th>
          <th class="text-center py-3 px-4 font-medium w-24"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td colspan="5" class="text-center py-12 text-muted-foreground">جاري التحميل...</td>
        </tr>
        <tr v-else-if="users.length === 0">
          <td colspan="5" class="text-center py-12 text-muted-foreground">لا يوجد مستخدمين</td>
        </tr>
        <tr
          v-for="user in users"
          :key="user.id"
          class="border-b border-border/50 hover:bg-muted/40 transition-colors"
        >
          <td class="py-3 px-4 font-medium">{{ user.name }}</td>
          <td class="py-3 px-4 text-muted-foreground">{{ user.email || user.login }}</td>
          <td class="py-3 px-4">
            <div class="flex flex-wrap gap-1">
              <span
                v-for="group in (user.groups || []).slice(0, 3)"
                :key="group.id"
                class="inline-block text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full"
              >
                {{ group.full_name || group.name }}
              </span>
              <span
                v-if="(user.groups || []).length > 3"
                class="inline-block text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
              >
                +{{ (user.groups || []).length - 3 }}
              </span>
            </div>
          </td>
          <td class="py-3 px-4">
            <span
              class="inline-block text-xs px-2 py-0.5 rounded-full"
              :class="user.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
            >
              {{ user.active ? 'نشط' : 'غير نشط' }}
            </span>
          </td>
          <td class="py-3 px-4 text-center">
            <div class="flex items-center justify-center gap-1">
              <button
                @click="emit('edit', user)"
                class="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="تعديل"
              >
                <Pencil class="w-4 h-4" />
              </button>
              <button
                v-if="user.active"
                @click="emit('delete', user)"
                class="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer"
                title="تعطيل"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

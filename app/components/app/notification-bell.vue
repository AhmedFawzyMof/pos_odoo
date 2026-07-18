<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { Bell, BellDot, CheckCheck, ChevronLeft } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useNotificationsStore } from "~~/stores/notifications"
import { useNotificationPoller } from "~~/app/composables/useNotificationPoller"
import { usePermissions } from "~~/app/composables/usePermissions"

const store = useNotificationsStore()
const { hasPermission } = usePermissions()
const open = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

useNotificationPoller()

onMounted(async () => {
  if (hasPermission("settings_access_rights")) {
    await store.fetchUnreadCount()
  }
})

function toggle() {
  if (open.value) {
    open.value = false
    return
  }
  open.value = true
  store.fetchNotifications()
}

function handleClickOutside(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener("click", handleClickOutside))
onUnmounted(() => document.removeEventListener("click", handleClickOutside))

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "الآن"
  if (mins < 60) return `منذ ${mins} د`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `منذ ${hrs} س`
  const days = Math.floor(hrs / 24)
  return `منذ ${days} ي`
}

const priorityColors: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-green-500",
}
</script>

<template>
  <div v-if="hasPermission('settings_access_rights')" ref="dropdownRef" class="relative">
    <Button
      variant="ghost"
      size="icon"
      class="rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground relative"
      @click="toggle"
    >
      <Bell v-if="store.unreadCount === 0" class="w-5 h-5" />
      <BellDot v-else class="w-5 h-5" />
      <span
        v-if="store.unreadCount > 0"
        class="absolute -top-1 -start-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
      >
        {{ store.unreadCount > 99 ? "99+" : store.unreadCount }}
      </span>
    </Button>

    <Transition name="fade">
      <div
        v-if="open"
        class="absolute left-0 top-full mt-2 w-[360px] bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
      >
        <div class="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 class="font-bold text-sm">الإشعارات</h3>
          <Button
            v-if="store.unreadCount > 0"
            variant="ghost"
            size="sm"
            class="text-xs gap-1 h-7"
            @click="store.markAllRead()"
          >
            <CheckCheck class="w-3.5 h-3.5" />
            تحديد الكل كمقروء
          </Button>
        </div>

        <div class="max-h-[360px] overflow-y-auto">
          <div v-if="store.notifications.length === 0" class="p-6 text-center text-muted-foreground text-sm">
            لا توجد إشعارات
          </div>
          <div
            v-for="n in store.notifications.slice(0, 10)"
            :key="n.id"
            class="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border/50 last:border-0"
            :class="{ 'bg-primary/5': !n.is_read }"
            @click="store.markRead(n.id)"
          >
            <div
              class="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
              :class="priorityColors[n.priority] || 'bg-gray-400'"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate" :class="{ 'text-foreground': !n.is_read, 'text-muted-foreground': n.is_read }">
                {{ n.title }}
              </p>
              <p class="text-xs text-muted-foreground truncate mt-0.5">{{ n.description }}</p>
              <p class="text-[10px] text-muted-foreground/60 mt-1">{{ timeAgo(n.created_at) }}</p>
            </div>
            <div v-if="!n.is_read" class="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
          </div>
        </div>

        <NuxtLink
          to="/notifications"
          class="flex items-center justify-center gap-1 px-4 py-3 border-t border-border text-sm text-primary font-medium hover:bg-muted/50 transition-colors"
          @click="open = false"
        >
          عرض كل الإشعارات
          <ChevronLeft class="w-4 h-4" />
        </NuxtLink>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>

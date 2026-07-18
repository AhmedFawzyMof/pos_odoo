import { defineStore } from "pinia"
import { ref, computed } from "vue"
import type { Notification, NotificationsListResponse, UnreadCountResponse, CheckResponse } from "~~/app/types/notification"

export const useNotificationsStore = defineStore("notifications", () => {
  const notifications = ref<Notification[]>([])
  const unreadCount = ref(0)
  const total = ref(0)
  const page = ref(1)
  const limit = ref(20)
  const categories = ref<string[]>([])
  const loading = ref(false)
  const unreadFilter = ref(false)
  const categoryFilter = ref("")

  const unread = computed(() => notifications.value.filter((n) => !n.is_read))

  async function fetchNotifications(append = false) {
    loading.value = true
    try {
      const params = new URLSearchParams({
        page: String(page.value),
        limit: String(limit.value),
      })
      if (unreadFilter.value) params.set("unread", "true")
      if (categoryFilter.value) params.set("category", categoryFilter.value)

      const res = await $fetch<NotificationsListResponse>(`/api/notifications?${params}`)
      if (append) {
        notifications.value.push(...res.data)
      } else {
        notifications.value = res.data
      }
      total.value = res.total
    } finally {
      loading.value = false
    }
  }

  async function fetchCategories() {
    try {
      categories.value = await $fetch<string[]>("/api/notifications/categories")
    } catch {
      // silent
    }
  }

  async function fetchUnreadCount() {
    try {
      const res = await $fetch<UnreadCountResponse>("/api/notifications/unread-count")
      unreadCount.value = res.count
    } catch {
      // silent
    }
  }

  async function markRead(id: number) {
    try {
      await $fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        body: { is_read: true },
      })
      const n = notifications.value.find((n) => n.id === id)
      if (n) n.is_read = 1
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch {
      // silent
    }
  }

  async function markAllRead() {
    try {
      await $fetch("/api/notifications/mark-all-read", { method: "POST" })
      notifications.value.forEach((n) => (n.is_read = 1))
      unreadCount.value = 0
    } catch {
      // silent
    }
  }

  async function triggerCheck() {
    try {
      const res = await $fetch<CheckResponse>("/api/notifications/check", { method: "POST" })
      if (res.created > 0) {
        await fetchNotifications()
        await fetchUnreadCount()
        await fetchCategories()
      }
      return res
    } catch {
      return { checked: 0, created: 0, errors: ["Connection failed"] }
    }
  }

  function setPage(p: number) {
    page.value = p
    fetchNotifications()
  }

  function setUnreadFilter(val: boolean) {
    unreadFilter.value = val
    page.value = 1
    fetchNotifications()
  }

  function setCategoryFilter(cat: string) {
    categoryFilter.value = cat
    page.value = 1
    fetchNotifications()
  }

  return {
    notifications,
    categories,
    unreadCount,
    total,
    page,
    limit,
    loading,
    unreadFilter,
    categoryFilter,
    unread,
    fetchNotifications,
    fetchCategories,
    fetchUnreadCount,
    markRead,
    markAllRead,
    triggerCheck,
    setPage,
    setUnreadFilter,
    setCategoryFilter,
  }
})

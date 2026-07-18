import { ref, watch, onMounted, onUnmounted } from "vue"
import { useNotificationsStore } from "~~/stores/notifications"
import { useAuth } from "./useAuth"
import { usePermissions } from "./usePermissions"

const POLL_INTERVAL = 15 * 60 * 1000

export function useNotificationPoller() {
  const store = useNotificationsStore()
  const { isAuthenticated } = useAuth()
  const { hasPermission } = usePermissions()
  const timer = ref<ReturnType<typeof setInterval> | null>(null)

  async function poll() {
    if (!isAuthenticated.value) return
    if (!hasPermission("settings_access_rights")) return
    await store.triggerCheck()
    await store.fetchUnreadCount()
  }

  function start() {
    stop()
    poll()
    timer.value = setInterval(poll, POLL_INTERVAL)
  }

  function stop() {
    if (timer.value) {
      clearInterval(timer.value)
      timer.value = null
    }
  }

  onMounted(() => {
    if (isAuthenticated.value && hasPermission("settings_access_rights")) {
      start()
    } else {
      const unwatch = watch(
        () => isAuthenticated.value,
        (val) => {
          if (val && hasPermission("settings_access_rights")) {
            start()
            unwatch()
          }
        },
      )
    }
  })

  onUnmounted(() => {
    stop()
  })

  return { start, stop, poll }
}

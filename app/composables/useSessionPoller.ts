import { ref, onUnmounted } from "vue";

const POLL_INTERVAL = 5 * 60 * 1000;

export interface SessionHeartbeat {
  active: boolean;
  session_id: number | null;
  state: string;
  error?: string;
}

export type SessionStatus = "active" | "expired" | "checking" | "error";

export function useSessionPoller() {
  const timer = ref<ReturnType<typeof setInterval> | null>(null);
  const status = ref<SessionStatus>("checking");
  const lastCheck = ref<Date | null>(null);

  function start(configId: string | number, sessionId: number | null, onExpired?: () => void) {
    stop();
    status.value = "checking";

    async function poll() {
      if (!configId || !sessionId) {
        status.value = "expired";
        onExpired?.();
        return;
      }

      try {
        const res = await $fetch<SessionHeartbeat>("/api/pos/session-heartbeat", {
          params: {
            config_id: String(configId),
            session_id: sessionId,
          },
        });

        lastCheck.value = new Date();

        if (res.active) {
          status.value = "active";
        } else {
          status.value = "expired";
          onExpired?.();
        }
      } catch {
        status.value = "error";
      }
    }

    poll();
    if (import.meta.client) {
      timer.value = setInterval(poll, POLL_INTERVAL);
    }
  }

  function stop() {
    if (timer.value) {
      clearInterval(timer.value);
      timer.value = null;
    }
  }

  onUnmounted(stop);

  return { start, stop, status, lastCheck };
}

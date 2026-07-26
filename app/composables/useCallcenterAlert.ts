import { ref } from "vue"

export function useCallcenterAlert() {
  const lastEvent = ref<any>(null)
  let eventSource: EventSource | null = null

  function playChime() {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      osc.start()
      osc.stop(ctx.currentTime + 0.5)
    } catch {}
  }

  function showNotification(title: string, body: string) {
    if (!("Notification" in window)) return
    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico" })
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((p) => {
        if (p === "granted") new Notification(title, { body, icon: "/favicon.ico" })
      })
    }
  }

  function connect() {
    if (eventSource) return
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
    eventSource = new EventSource("/api/notifications/events")
    eventSource.onmessage = (e) => {
      if (e.data === ":connected" || !e.data) return
      try {
        const data = JSON.parse(e.data)
        lastEvent.value = data
        if (data.type === "callcenter_new_order") {
          playChime()
          showNotification(data.title || "New Order", data.description || data.orderName)
        }
      } catch {}
    }
    eventSource.onerror = () => {
      eventSource?.close()
      eventSource = null
      setTimeout(connect, 5000)
    }
  }

  function disconnect() {
    eventSource?.close()
    eventSource = null
  }

  return { lastEvent, connect, disconnect }
}

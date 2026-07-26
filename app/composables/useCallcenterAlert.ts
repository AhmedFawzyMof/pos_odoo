import { ref } from "vue"

export function useCallcenterAlert() {
  const lastEvent = ref<any>(null)
  let eventSource: EventSource | null = null

  function playChime() {
    try {
      const ctx = new AudioContext()
      const notes = [523.25, 659.25, 783.99]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = "sine"
        osc.connect(gain)
        gain.connect(ctx.destination)
        const t = ctx.currentTime + i * 0.15
        osc.frequency.setValueAtTime(freq, t)
        gain.gain.setValueAtTime(0.25, t)
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3)
        osc.start(t)
        osc.stop(t + 0.3)
      })
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

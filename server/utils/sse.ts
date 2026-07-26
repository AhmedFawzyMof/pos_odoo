type SSECallback = (data: string) => void
const clients = new Set<SSECallback>()

export function subscribe(cb: SSECallback): () => void {
  clients.add(cb)
  return () => { clients.delete(cb) }
}

export function publish(data: string): void {
  for (const cb of clients) {
    try { cb(data) } catch { clients.delete(cb) }
  }
}

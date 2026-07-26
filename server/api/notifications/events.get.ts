import { defineEventHandler } from "h3"
import { subscribe } from "../../utils/sse"
import { requireAnyPermission } from "../../utils/permissions"

export default defineEventHandler(async (event) => {
  await requireAnyPermission(event, ["pos_user", "pos_manager", "settings_access_rights"])

  const res = event.node.res

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })

  res.write(":connected\n\n")

  const unsub = subscribe((data) => {
    res.write(`data: ${data}\n\n`)
  })

  event.node.req.on("close", () => {
    unsub()
    res.end()
  })
})

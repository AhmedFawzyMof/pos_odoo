import { defineEventHandler, readBody, createError } from "h3"
import { getDb } from "../../db"
import { publish } from "../../utils/sse"

export default defineEventHandler(async (event) => {
  console.log('[webhook] received POST /api/notifications/callcenter-webhook')

  const secret = event.headers.get("x-webhook-secret")
  const expected = process.env.CALLCENTER_WEBHOOK_SECRET
  console.log(`[webhook] secret match: ${secret === expected} (expected=${expected})`)

  if (!expected || secret !== expected) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" })
  }

  const body = await readBody(event)
  console.log(`[webhook] body:`, JSON.stringify(body))

  const orderId = Number(body?.order_id)
  const orderName = String(body?.order_name || "")
  const message = String(body?.message || "New order from callcenter")

  if (!orderId || !orderName) {
    throw createError({ statusCode: 400, statusMessage: "order_id and order_name required" })
  }

  const db = getDb()

  const typeRow = db.prepare(
    "SELECT id, category, priority, title_ar FROM notification_types WHERE trigger_event = 'callcenter_new_order'",
  ).get() as any

  if (!typeRow) {
    throw createError({ statusCode: 500, statusMessage: "Notification type not seeded" })
  }

  const title = `طلب جديد من مركز الاتصال: ${orderName}`
  const description = message

  db.prepare(`
    INSERT INTO notifications (type_id, category, title, description, priority, odoo_ref_id, odoo_ref_model, odoo_ref_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(typeRow.id, typeRow.category, title, description, typeRow.priority, orderId, "pos.order", orderName)

  console.log(`[webhook] inserted notification for order ${orderName} (id=${orderId})`)

  const payload = JSON.stringify({ type: "callcenter_new_order", orderId, orderName, title, description })

  publish(payload)
  console.log(`[webhook] published to SSE bus`)

  return { success: true }
})

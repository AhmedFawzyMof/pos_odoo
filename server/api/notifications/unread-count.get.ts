import { defineEventHandler, createError } from "h3"
import { getDb } from "../../db"
import { requirePermission } from "../../utils/permissions"

export default defineEventHandler(async (event) => {
  await requirePermission(event, "settings_access_rights")

  const db = getDb(event.context.odooDb)
  const row = db.prepare("SELECT COUNT(*) as count FROM notifications WHERE is_read = 0").get() as any

  return { count: row.count }
})

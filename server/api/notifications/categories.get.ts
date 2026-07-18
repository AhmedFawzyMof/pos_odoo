import { defineEventHandler } from "h3"
import { getDb } from "../../db"
import { requirePermission } from "../../utils/permissions"

export default defineEventHandler(async (event) => {
  await requirePermission(event, "settings_access_rights")
  const db = getDb()
  const rows = db.prepare("SELECT DISTINCT category FROM notifications ORDER BY category").all() as { category: string }[]
  return rows.map((r) => r.category)
})

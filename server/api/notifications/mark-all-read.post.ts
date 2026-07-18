import { defineEventHandler, createError } from "h3"
import { getDb } from "../../db"
import { requirePermission } from "../../utils/permissions"

export default defineEventHandler(async (event) => {
  await requirePermission(event, "settings_access_rights")

  const db = getDb()
  const result = db.prepare("UPDATE notifications SET is_read = 1 WHERE is_read = 0").run()

  return { success: true, updated: result.changes }
})

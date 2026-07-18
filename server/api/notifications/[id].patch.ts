import { defineEventHandler, getRouterParam, readBody, createError } from "h3"
import { getDb } from "../../db"
import { requirePermission } from "../../utils/permissions"

export default defineEventHandler(async (event) => {
  await requirePermission(event, "settings_access_rights")

  const id = parseInt(getRouterParam(event, "id") || "")
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Invalid notification ID" })
  }

  const body = await readBody(event)
  const isRead = body?.is_read

  if (typeof isRead !== "boolean" && typeof isRead !== "number") {
    throw createError({ statusCode: 400, statusMessage: "is_read field is required (boolean or number)" })
  }

  const db = getDb()
  const result = db.prepare("UPDATE notifications SET is_read = ? WHERE id = ?").run(isRead ? 1 : 0, id)

  if (result.changes === 0) {
    throw createError({ statusCode: 404, statusMessage: "Notification not found" })
  }

  return { success: true }
})

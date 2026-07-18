import { defineEventHandler, getQuery, createError } from "h3"
import { getDb } from "../../db"
import { requirePermission } from "../../utils/permissions"

export default defineEventHandler(async (event) => {
  await requirePermission(event, "settings_access_rights")

  const query = getQuery(event)
  const page = Math.max(1, parseInt((query.page as string) || "1"))
  const limit = Math.min(50, Math.max(1, parseInt((query.limit as string) || "20")))
  const unreadOnly = (query.unread as string) === "true"
  const category = (query.category as string) || ""

  const db = getDb()

  let where = "WHERE 1=1"
  const params: any[] = []

  if (unreadOnly) {
    where += " AND n.is_read = 0"
  }

  if (category) {
    where += " AND n.category = ?"
    params.push(category)
  }

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM notifications n ${where}`).get(...params) as any
  const total = countRow.total

  const offset = (page - 1) * limit
  const rows = db
    .prepare(
      `SELECT n.* FROM notifications n ${where} ORDER BY n.created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as any[]

  return {
    data: rows,
    total,
    page,
    limit,
  }
})

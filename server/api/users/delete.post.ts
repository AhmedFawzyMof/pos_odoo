import { defineEventHandler, readBody, createError } from 'h3'
import { getAdminOdooClient } from '~~/server/utils/odooClient'
import { requirePermission } from '~~/server/utils/permissions'
import { tryCatch } from '~~/server/utils/tryCatch'
import { getDb } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient()
  await requirePermission(event, 'settings_access_rights')

  const body = await readBody(event)
  if (!body.id) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  const [deactivateErr] = await tryCatch(
    odoo.execute_kw('res.users', 'write', [[[body.id], { active: false }]])
  )
  if (deactivateErr) {
    throw createError({ statusCode: 500, message: deactivateErr.message || 'Failed to deactivate user' })
  }

  // Mark as inactive in local SQLite
  const db = getDb()
  db.prepare('UPDATE users SET active = 0, updated_at = datetime(\'now\') WHERE odoo_user_id = ?').run(Number(body.id))

  return { success: true, message: 'User deactivated' }
})

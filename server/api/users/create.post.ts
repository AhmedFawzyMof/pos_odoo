import { defineEventHandler, readBody, createError } from 'h3'
import { getAdminOdooClient } from '~~/server/utils/odooClient'
import { requirePermission } from '~~/server/utils/permissions'
import { tryCatch } from '~~/server/utils/tryCatch'
import { getDb } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient()
  const session = await getUserSession(event)
  await requirePermission(event, 'settings_access_rights')

  const body = await readBody(event)

  if (!body.name || !body.login || !body.password) {
    throw createError({ statusCode: 400, message: 'Name, login, and password are required' })
  }

  function normalizeLogin(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.includes("@")) return trimmed;
    return `${trimmed}@gmail.com`;
  }

  const vals: any = {
    name: body.name,
    login: normalizeLogin(body.login),
    password: body.password,
    email: body.email || normalizeLogin(body.login),
    active: body.active !== false,
  }

  if (session.currentCompanyId) {
    vals.company_id = session.currentCompanyId
    vals.company_ids = [[6, 0, [session.currentCompanyId]]]
  }

  if (body.groups_id && body.groups_id.length > 0) {
    vals.groups_id = [[6, 0, body.groups_id.map(Number)]]
  }

  const [createErr, newId] = await tryCatch(odoo.execute_kw('res.users', 'create', [[vals]]))
  if (createErr) {
    throw createError({ statusCode: 500, message: createErr.message || 'Failed to create user' })
  }

  // Save to local SQLite
  const db = getDb()
  const info = db.prepare(
    'INSERT INTO users (odoo_user_id, name, login, active) VALUES (?, ?, ?, ?)'
  ).run(Number(newId), body.name, body.login.trim(), body.active !== false ? 1 : 0)

  // Save roles
  const roles = body.roles || []
  const roleInsert = db.prepare(
    'INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, (SELECT id FROM roles WHERE name = ?))'
  )
  for (const roleName of roles) {
    roleInsert.run(info.lastInsertRowid, roleName)
  }

  // Cache Odoo groups
  const groupIds = (body.groups_id || []).map(Number)
  if (groupIds.length > 0) {
    const [groupErr, groupRecords] = await tryCatch(
      odoo.execute_kw('res.groups', 'search_read', [
        [['id', 'in', groupIds]],
        { fields: ['id', 'name', 'full_name', 'category_id'] },
      ])
    )
    if (!groupErr && groupRecords) {
      const groupInsert = db.prepare(
        'INSERT INTO user_odoo_groups (user_id, odoo_group_id, group_name, full_name) VALUES (?, ?, ?, ?)'
      )
      for (const g of groupRecords) {
        groupInsert.run(
          info.lastInsertRowid,
          g.id,
          g.name,
          g.full_name || `${g.category_id?.[1] || ''} / ${g.name}`
        )
      }
    }
  }

  return { success: true, id: newId }
})

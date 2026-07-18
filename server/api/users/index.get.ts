import { defineEventHandler, createError } from 'h3'
import { getAdminOdooClient } from '~~/server/utils/odooClient'
import { requirePermission } from '~~/server/utils/permissions'
import { tryCatch } from '~~/server/utils/tryCatch'
import { getDb } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient()
  const session = await getUserSession(event)
  await requirePermission(event, 'settings_access_rights')

  const query = getQuery(event)
  const page = Number(query.page) || 1
  const limit = Number(query.limit) || 50
  const offset = (page - 1) * limit

  const systemLogins = ['default', '__system__', 'portaltemplate', 'public']
  const domain: any[] = [['active', 'in', [true, false]], ['login', 'not in', systemLogins]]
  if (query.search) {
    domain.push(['name', 'ilike', query.search])
  }
  if (session.currentCompanyId) {
    domain.push('|', ['company_id', '=', session.currentCompanyId], ['company_ids', 'in', [session.currentCompanyId]])
  }

  const [countErr, total] = await tryCatch(
    odoo.execute_kw('res.users', 'search_count', [[domain]])
  )
  if (countErr) {
    throw createError({ statusCode: 500, message: 'Failed to count users' })
  }

  const [userErr, users] = await tryCatch(
    odoo.execute_kw('res.users', 'search_read', [
      [domain],
      { fields: ['id', 'name', 'login', 'email', 'active', 'groups_id', 'company_id'], offset, limit, order: 'name asc' },
    ])
  )
  if (userErr || !users) {
    throw createError({ statusCode: 500, message: 'Failed to fetch users' })
  }

  // Resolve Odoo group names
  const allGroupIds = [...new Set(users.flatMap((u: any) => u.groups_id || []))]
  const groupDomain = [['id', 'in', allGroupIds]]
  const [groupErr, groups] = await tryCatch(
    odoo.execute_kw('res.groups', 'search_read', [
      [groupDomain],
      { fields: ['id', 'name', 'full_name', 'category_id', 'share'] },
    ])
  )
  if (!groupErr && groups) {
    const groupMap = Object.fromEntries(groups.map((g: any) => [g.id, g]))
    for (const user of users) {
      user.groups = (user.groups_id || []).map((id: number) => groupMap[id]).filter(Boolean)
      delete user.groups_id
    }
  }

  // Attach local roles from SQLite
  const db = getDb()
  const odooIds = users.map((u: any) => Number(u.id))
  if (odooIds.length > 0) {
    const placeholders = odooIds.map(() => '?').join(',')
    const localUsers = db.prepare(
      `SELECT id, odoo_user_id FROM users WHERE odoo_user_id IN (${placeholders})`
    ).all(...odooIds) as any[]

    const localUserMap = Object.fromEntries(localUsers.map((u: any) => [u.odoo_user_id, u.id]))

    for (const user of users) {
      const localId = localUserMap[Number(user.id)]
      if (localId) {
        const roles = db.prepare(`
          SELECT r.name FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = ?
        `).all(localId).map((r: any) => r.name)
        user.localRoles = roles
      } else {
        user.localRoles = []
      }
    }
  }

  return {
    success: true,
    data: users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
})

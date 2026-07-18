import { defineEventHandler, createError } from 'h3'
import { getAdminOdooClient } from '~~/server/utils/odooClient'
import { requirePermission } from '~~/server/utils/permissions'
import { tryCatch } from '~~/server/utils/tryCatch'
import { getDb } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient()
  await requirePermission(event, 'settings_access_rights')

  const query = getQuery(event)
  const userId = Number(query.id)
  if (!userId) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  const [userErr, users] = await tryCatch(
    odoo.read('res.users', [userId], ['id', 'name', 'login', 'email', 'active', 'groups_id', 'company_id'])
  )
  if (userErr || !users || users.length === 0) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const user = users[0] as any
  const rawGroupIds = user.groups_id || []
  const groupIds = rawGroupIds.map((g: any) => (Array.isArray(g) ? g[0] : g))

  const groupDomain = [['id', 'in', groupIds]]
  const [groupErr, groups] = await tryCatch(
    odoo.execute_kw('res.groups', 'search_read', [
      [groupDomain],
      { fields: ['id', 'name', 'full_name', 'category_id', 'share'] },
    ])
  )
  if (!groupErr && groups) {
    user.groups = groups
  } else {
    user.groups = []
  }
  delete user.groups_id

  // Refresh Odoo groups cache in SQLite
  const db = getDb()
  const localUser = db.prepare('SELECT id FROM users WHERE odoo_user_id = ?').get(Number(userId)) as any
  if (localUser && !groupErr && groups) {
    db.prepare('DELETE FROM user_odoo_groups WHERE user_id = ?').run(localUser.id)
    const groupInsert = db.prepare(
      'INSERT INTO user_odoo_groups (user_id, odoo_group_id, group_name, full_name) VALUES (?, ?, ?, ?)'
    )
    for (const g of groups) {
      groupInsert.run(
        localUser.id,
        g.id,
        g.name,
        g.full_name || `${g.category_id?.[1] || ''} / ${g.name}`
      )
    }
  }

  // Attach local roles from SQLite
  if (localUser) {
    const roles = db.prepare(`
      SELECT r.name FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `).all(localUser.id).map((r: any) => r.name)
    user.localRoles = roles
  } else {
    user.localRoles = []
  }

  return { success: true, data: user }
})

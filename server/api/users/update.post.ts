import { defineEventHandler, readBody, createError } from 'h3'
import { getAdminOdooClient } from '~~/server/utils/odooClient'
import { requirePermission } from '~~/server/utils/permissions'
import { tryCatch } from '~~/server/utils/tryCatch'
import { getDb } from '~~/server/db'

const MANAGED_ODOO_GROUP_NAMES = [
  'Point of Sale / User',
  'Point of Sale / Administrator',
  'Purchase / User',
  'Purchase / Administrator',
  'Accounting / Invoicing',
  'Accounting / Administrator',
  'Inventory / User',
  'Inventory / Administrator',
  'Administration / Access Rights',
  'Internal User',
]

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient()
  const session = await getUserSession(event)
  await requirePermission(event, 'settings_access_rights')

  const body = await readBody(event)

  if (!body.id) {
    throw createError({ statusCode: 400, message: 'User ID is required' })
  }

  const vals: any = {}
  if (body.name) vals.name = body.name
  if (body.email) vals.email = body.email
  if (body.login) vals.login = body.login
  if (body.password) vals.password = body.password
  if (body.active !== undefined) vals.active = body.active

  let finalGroupIds: number[] | undefined

  if (body.groups_id) {
    const desiredGroupIds = body.groups_id.map(Number)

    const [currentErr, currentUsers] = await tryCatch(
      odoo.read('res.users', [Number(body.id)], ['groups_id'])
    )

    if (!currentErr && currentUsers && currentUsers.length > 0) {
      const currentGroupIds = (currentUsers[0].groups_id || []).map((g: any) =>
        Number(Array.isArray(g) ? g[0] : g)
      )

      const [managedErr, managedGroups] = await tryCatch(
        odoo.execute_kw('res.groups', 'search_read', [
          [['full_name', 'in', MANAGED_ODOO_GROUP_NAMES]],
          { fields: ['id'] },
        ])
      )

      if (!managedErr && managedGroups) {
        const managedGroupIds = new Set(managedGroups.map((g: any) => g.id))
        const preservedGroupIds = currentGroupIds.filter(id => !managedGroupIds.has(id))
        finalGroupIds = [...new Set([...preservedGroupIds, ...desiredGroupIds])]
      } else {
        finalGroupIds = desiredGroupIds
      }
    } else {
      finalGroupIds = desiredGroupIds
    }

    vals.groups_id = [[6, 0, finalGroupIds]]
  }

  const [updateErr] = await tryCatch(odoo.execute_kw('res.users', 'write', [[[body.id], vals]]))
  if (updateErr) {
    throw createError({ statusCode: 500, message: updateErr.message || 'Failed to update user' })
  }

  // Update local SQLite
  const db = getDb()
  const localUser = db.prepare('SELECT id FROM users WHERE odoo_user_id = ?').get(Number(body.id)) as any

  if (localUser) {
    if (body.name || body.active !== undefined) {
      const updateVals: any = { updated_at: new Date().toISOString() }
      if (body.name) updateVals.name = body.name
      if (body.active !== undefined) updateVals.active = body.active ? 1 : 0
      const sets = Object.keys(updateVals).map(k => `${k} = ?`).join(', ')
      const valsArr = Object.values(updateVals)
      valsArr.push(localUser.id)
      db.prepare(`UPDATE users SET ${sets} WHERE id = ?`).run(...valsArr)
    }

    // Update roles
    if (body.roles) {
      db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(localUser.id)
      const roleInsert = db.prepare(
        'INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, (SELECT id FROM roles WHERE name = ?))'
      )
      for (const roleName of body.roles) {
        roleInsert.run(localUser.id, roleName)
      }
    }

    // Update Odoo groups cache
    if (finalGroupIds) {
      db.prepare('DELETE FROM user_odoo_groups WHERE user_id = ?').run(localUser.id)
      if (finalGroupIds.length > 0) {
        const [groupErr, groupRecords] = await tryCatch(
          odoo.execute_kw('res.groups', 'search_read', [
            [['id', 'in', finalGroupIds]],
            { fields: ['id', 'name', 'full_name', 'category_id'] },
          ])
        )
        if (!groupErr && groupRecords) {
          const groupInsert = db.prepare(
            'INSERT INTO user_odoo_groups (user_id, odoo_group_id, group_name, full_name) VALUES (?, ?, ?, ?)'
          )
          for (const g of groupRecords) {
            groupInsert.run(
              localUser.id,
              g.id,
              g.name,
              g.full_name || `${g.category_id?.[1] || ''} / ${g.name}`
            )
          }
        }
      }
    }
  }

  // If updating own permissions, return refreshed session info
  let refreshedRoles: string[] | undefined
  if (body.roles && session.user?.odooUserId === Number(body.id)) {
    const roles = db.prepare(`
      SELECT r.name FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `).all(localUser.id).map((r: any) => r.name)
    refreshedRoles = roles

    await setUserSession(event, {
      ...session,
      user: {
        ...session.user,
        roles,
      },
    })
  }

  return { success: true, roles: refreshedRoles }
})

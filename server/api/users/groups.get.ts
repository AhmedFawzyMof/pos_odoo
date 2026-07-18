import { defineEventHandler, createError } from 'h3'
import { getAdminOdooClient } from '~~/server/utils/odooClient'
import { requirePermission } from '~~/server/utils/permissions'
import { tryCatch } from '~~/server/utils/tryCatch'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient()
  await requirePermission(event, 'settings_access_rights')

  const [groupErr, groups] = await tryCatch(
    odoo.execute_kw('res.groups', 'search_read', [
      [[]],
      { fields: ['id', 'name', 'full_name', 'category_id', 'share'], order: 'category_id, name' },
    ])
  )
  if (groupErr || !groups) {
    throw createError({ statusCode: 500, message: 'Failed to fetch groups' })
  }

  const categoryIds = [...new Set(groups.map((g: any) => g.category_id?.[0]).filter(Boolean))]

  const catDomain = [['id', 'in', categoryIds]]
  const [catErr, categories] = await tryCatch(
    odoo.execute_kw('ir.module.category', 'search_read', [
      [catDomain],
      { fields: ['id', 'name'] },
    ])
  )

  const categoryMap: Record<number, string> = {}
  if (!catErr && categories) {
    for (const c of categories) {
      categoryMap[c.id] = c.name
    }
  }

  const grouped = groups
    .filter((g: any) => g.category_id)
    .map((g: any) => ({
      id: g.id,
      name: g.name,
      fullName: g.full_name,
      categoryId: g.category_id[0],
      categoryName: categoryMap[g.category_id[0]] || g.category_id[1] || '',
      share: g.share,
    }))

  return { success: true, data: grouped }
})

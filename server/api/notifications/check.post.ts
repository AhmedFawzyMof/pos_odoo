import { defineEventHandler, createError } from "h3"
import { getDb } from "../../db"
import { getAdminOdooClient } from "../../utils/odooClient"
import { requirePermission } from "../../utils/permissions"
import { tryCatch } from "../../utils/tryCatch"

export default defineEventHandler(async (event) => {
  await requirePermission(event, "settings_access_rights")

  const db = getDb()
  const odoo = await getAdminOdooClient()

  const types = db.prepare("SELECT * FROM notification_types WHERE is_active = 1").all() as any[]

  const errors: string[] = []
  let totalCreated = 0

  for (const t of types) {
    const [checkErr, results] = await tryCatch(runCheck(t.trigger_event, odoo, db))
    if (checkErr) {
      errors.push(`${t.trigger_event}: ${checkErr.message}`)
      continue
    }
    if (!results || results.length === 0) continue

    const existingRefs = new Set(
      (db.prepare("SELECT odoo_ref_id FROM notifications WHERE type_id = ? AND odoo_ref_id IS NOT NULL").all(t.id) as any[]).map((r: any) => r.odoo_ref_id),
    )

    const insert = db.prepare(`
      INSERT INTO notifications (type_id, category, title, description, priority, odoo_ref_id, odoo_ref_model, odoo_ref_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const tx = db.transaction(() => {
      for (const item of results) {
        if (item.odoo_ref_id != null && existingRefs.has(item.odoo_ref_id)) continue
        insert.run(
          t.id, t.category, item.title, item.description,
          t.priority, item.odoo_ref_id ?? null, item.odoo_ref_model ?? null, item.odoo_ref_name ?? null,
        )
        totalCreated++
      }
    })
    tx()
  }

  return { checked: types.length, created: totalCreated, errors }
})

async function runCheck(trigger: string, odoo: any, db: any): Promise<any[]> {
  switch (trigger) {
    case "low_stock": return checkLowStock(odoo)
    case "stock_discrepancy": return checkStockDiscrepancy(odoo)
    case "po_delayed": return checkPoDelayed(odoo)
    case "new_invoice": return checkNewInvoice(odoo, db)
    case "cash_shortage": return checkCashShortage(odoo)
    case "credit_limit_reached": return checkCreditLimit(odoo)
    case "tax_reminder": return checkTaxReminder(odoo, db)
    default: return []
  }
}

async function checkLowStock(odoo: any): Promise<any[]> {
  const orderpoints = await odoo.searchRead(
    "stock.warehouse.orderpoint",
    [],
    ["id", "product_id", "product_min_qty", "qty_on_hand", "warehouse_id"],
    { offset: 0, limit: 200 },
  )
  const low: any[] = []
  for (const op of orderpoints) {
    const qtyOnHand = parseFloat(op.qty_on_hand ?? 0)
    const minQty = parseFloat(op.product_min_qty ?? 0)
    if (qtyOnHand > 0 && qtyOnHand <= minQty) {
      const [prodErr, product] = await tryCatch(
        odoo.read("product.product", op.product_id[0], ["display_name"]),
      ) as any
      const name = product?.display_name || `Product #${op.product_id[0]}`
      low.push({
        odoo_ref_id: op.id,
        odoo_ref_model: "stock.warehouse.orderpoint",
        odoo_ref_name: name,
        title: `نقص مخزون: ${name}`,
        description: `الكمية المتاحة (${qtyOnHand}) أقل من الحد الأدنى (${minQty})`,
      })
    }
  }
  return low
}

async function checkStockDiscrepancy(odoo: any): Promise<any[]> {
  const quants = await odoo.searchRead(
    "stock.quant",
    [["inventory_diff_quantity", "!=", 0]],
    ["id", "product_id", "inventory_diff_quantity", "location_id", "quantity"],
    { offset: 0, limit: 100 },
  )
  return quants.map((q: any) => {
    const diff = parseFloat(q.inventory_diff_quantity ?? 0)
    return {
      odoo_ref_id: q.id,
      odoo_ref_model: "stock.quant",
      odoo_ref_name: q.product_id?.[1] || `Product #${q.product_id?.[0]}`,
      title: `اختلاف مخزون: ${q.product_id?.[1] || "غير معروف"}`,
      description: `فرق الجرد: ${diff.toFixed(2)} في ${q.location_id?.[1] || "غير محدد"}`,
    }
  })
}

async function checkPoDelayed(odoo: any): Promise<any[]> {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ")
  const orders = await odoo.searchRead(
    "purchase.order",
    [["state", "=", "purchase"], ["date_planned", "<", now]],
    ["id", "name", "partner_id", "date_planned", "amount_total"],
    { offset: 0, limit: 100 },
  )
  return orders.map((po: any) => ({
    odoo_ref_id: po.id,
    odoo_ref_model: "purchase.order",
    odoo_ref_name: po.name,
    title: `تأخير أمر شراء: ${po.name}`,
    description: `المورد: ${po.partner_id?.[1] || "غير معروف"} - التاريخ المخطط: ${po.date_planned?.slice(0, 10)}`,
  }))
}

async function checkNewInvoice(odoo: any, db: any): Promise<any[]> {
  const latestRow = db.prepare(
    "SELECT created_at FROM notifications WHERE type_id = (SELECT id FROM notification_types WHERE trigger_event = 'new_invoice') ORDER BY created_at DESC LIMIT 1",
  ).get() as any

  let since: string
  if (latestRow) {
    const d = new Date(latestRow.created_at)
    d.setHours(d.getHours() - 1)
    since = d.toISOString().slice(0, 19).replace("T", " ")
  } else {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    since = d.toISOString().slice(0, 19).replace("T", " ")
  }

  const invoices = await odoo.searchRead(
    "account.move",
    [["move_type", "=", "in_invoice"], ["state", "=", "posted"], ["invoice_date", ">=", since.slice(0, 10)]],
    ["id", "name", "partner_id", "invoice_date", "amount_total"],
    { offset: 0, limit: 100 },
  )
  return invoices.map((inv: any) => ({
    odoo_ref_id: inv.id,
    odoo_ref_model: "account.move",
    odoo_ref_name: inv.name,
    title: `فاتورة مورد جديدة: ${inv.name}`,
    description: `المورد: ${inv.partner_id?.[1] || "غير معروف"} - المبلغ: ${inv.amount_total?.toFixed(2)} - التاريخ: ${inv.invoice_date}`,
  }))
}

async function checkCashShortage(odoo: any): Promise<any[]> {
  const sessions = await odoo.searchRead(
    "pos.session",
    [["state", "=", "closed"]],
    ["id", "name", "user_id", "cash_register_difference", "stop_at"],
    { offset: 0, limit: 50 },
  )
  const results: any[] = []
  for (const s of sessions) {
    const diff = parseFloat(s.cash_register_difference ?? 0)
    if (Math.abs(diff) > 0.01) {
      const sign = diff > 0 ? "زيادة" : "عجز"
      results.push({
        odoo_ref_id: s.id,
        odoo_ref_model: "pos.session",
        odoo_ref_name: s.name,
        title: `${sign} نقدي: ${s.name}`,
        description: `قيمة الفرق: ${Math.abs(diff).toFixed(2)} - الكاشير: ${s.user_id?.[1] || "غير معروف"}`,
      })
    }
  }
  return results
}

async function checkCreditLimit(odoo: any): Promise<any[]> {
  const partners = await odoo.searchRead(
    "res.partner",
    [["supplier_rank", ">", 0], ["credit_limit", ">", 0]],
    ["id", "name", "credit", "credit_limit"],
    { offset: 0, limit: 200 },
  )
  const results: any[] = []
  for (const p of partners) {
    const credit = parseFloat(p.credit ?? 0)
    const limit = parseFloat(p.credit_limit ?? 0)
    if (credit >= limit) {
      results.push({
        odoo_ref_id: p.id,
        odoo_ref_model: "res.partner",
        odoo_ref_name: p.name,
        title: `حد ائتمان المورد: ${p.name}`,
        description: `الرصيد: ${credit.toFixed(2)} / الحد: ${limit.toFixed(2)}`,
      })
    }
  }
  return results
}

async function checkTaxReminder(odoo: any, db: any): Promise<any[]> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const lastDay = new Date(year, month, 0).getDate()
  const daysUntilEnd = lastDay - now.getDate()

  if (daysUntilEnd > 7) return []

  const reminderKey = year * 100 + month
  const existing = db.prepare(
    "SELECT COUNT(*) as count FROM notifications WHERE type_id = (SELECT id FROM notification_types WHERE trigger_event = 'tax_reminder') AND odoo_ref_id = ?",
  ).get(reminderKey) as any

  if (existing.count > 0) return []

  return [{
    odoo_ref_id: reminderKey,
    odoo_ref_model: "account.tax",
    odoo_ref_name: `${year}/${month}`,
    title: `تذكير دفع الضرائب - ${month}/${year}`,
    description: `موعد دفع الضرائب في نهاية الشهر (باقي ${daysUntilEnd} يوم)`,
  }]
}

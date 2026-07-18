import { createError } from "h3"
import { connectToOdoo } from "./client"
import { tryCatch } from "./tryCatch"

export async function getAdminOdooClient(companyId?: number) {
  const username = process.env.ADMIN_ODOO_USER
  const password = process.env.ADMIN_ODOO_PASS

  if (!username || !password) {
    throw createError({
      statusCode: 500,
      message: "ADMIN_ODOO_USER / ADMIN_ODOO_PASS not configured in .env",
    })
  }

  const odoo = connectToOdoo(username, password, companyId)
  const [connectErr] = await tryCatch(odoo.connect())
  if (connectErr) {
    throw createError({
      statusCode: 500,
      message: `Failed to connect to Odoo as admin: ${connectErr.message}`,
    })
  }
  return odoo
}

import { defineEventHandler, getCookie } from "h3"

export default defineEventHandler((event) => {
  const cookieDb = getCookie(event, "odoo_db")
  event.context.odooDb = cookieDb || process.env.DEFAULT_DB!
})

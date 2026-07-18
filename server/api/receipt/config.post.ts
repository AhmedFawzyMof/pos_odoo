import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'
import { getDb } from "~~/server/db";

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'pos_manager')

  const session = await getUserSession(event);
  const [userErr, userData] = await tryCatch(
    odoo.read("res.users", (session.user as any).odooUserId, ["company_id"]),
  );
  if (userErr) throw userErr;

  const companyId = (userData[0] as any).company_id?.[0];
  if (!companyId) {
    throw createError({ statusCode: 404, statusMessage: "Company not found" });
  }

  const body = await readBody(event);

  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO receipt_configs (company_id, config, updated_at) VALUES (?, ?, datetime('now'))`
  ).run(companyId, JSON.stringify(body));

  return { success: true, message: "Receipt configuration saved successfully" };
});

import { defineEventHandler } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'purchase_user')
  const [rpcErr, result] = await tryCatch(
    odoo.execute_kw("operational.expense.api", "get_expense_categories", [[]]),
  );
  if (rpcErr) throw rpcErr;
  return result;
});

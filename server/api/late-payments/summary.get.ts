import { defineEventHandler } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'account_invoice')
  const [rpcErr, result] = await tryCatch(
    odoo.execute_kw("late.payment.api", "get_late_payment_summary", [[]]),
  );
  if (rpcErr) throw rpcErr;
  return result;
});

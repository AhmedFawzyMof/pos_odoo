import { defineEventHandler, getQuery, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const paramsPayload = {
    page: (query.page as string) || "1",
    search: (query.search as string) || "",
    status: (query.status as string) || "all",
  };

  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'purchase_user')
  const [rpcErr, result] = await tryCatch(
    odoo.execute_kw("res.partner", "get_pos_suppliers", [[paramsPayload]]),
  );
  if (rpcErr) throw rpcErr;
  return result;
});

import { defineEventHandler, getQuery, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const paramsPayload = {
    page: (query.page as string) || "1",
    limit: (query.limit as string) || "20",
    search: (query.search as string) || "",
    state: (query.state as string) || "",
    date_from: (query.date_from as string) || "",
    date_to: (query.date_to as string) || "",
    supplier_id: (query.supplier_id as string) || "",
  };

  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'purchase_user')
  const [rpcErr, result] = await tryCatch(
    odoo.execute_kw("purchase.order.api", "get_purchase_orders", [
      [paramsPayload],
    ]),
  );
  if (rpcErr) throw rpcErr;
  return result;
});

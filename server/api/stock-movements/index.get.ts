import { defineEventHandler, getQuery, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const params = {
    page: Math.max(1, parseInt((query.page as string) || "1")),
    limit: Math.min(50, Math.max(1, parseInt((query.limit as string) || "26"))), // Matches the frontend default (26)
    search: (query.search as string) || "",
    type: (query.type as string) || "all",
    usage: (query.usage as string) || "",
    dateFrom: (query.dateFrom as string) || "",
    dateTo: (query.dateTo as string) || "",
    productId: (query.productId as string) || "",
  };

  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'stock_user')
  const [rpcErr, result] = await tryCatch(
    odoo.execute_kw("stock.move.line", "get_frontend_ledger", [
      [],
      { params: params },
    ]),
  );

  if (rpcErr) {
    throw rpcErr;
  }

  return result;
});

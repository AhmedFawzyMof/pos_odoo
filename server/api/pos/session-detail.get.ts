import { defineEventHandler, getQuery, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const sessionId = parseInt(String(query.session_id ?? ""), 10);

  if (!sessionId) {
    throw createError({
      statusCode: 400,
      statusMessage: "session_id is required",
    });
  }

  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'pos_user')

  const [rpcErr, rpcResult] = await tryCatch(
    odoo.execute_kw("report.point_of_sale.report_saledetails", "get_sale_details", [[], {
      session_ids: [sessionId],
    }]),
  );

  if (rpcErr) {
    throw createError({
      statusCode: 500,
      message: `RPC failed: ${rpcErr.message}`,
    });
  }

  return {
    success: true,
    detail: rpcResult,
  };
});

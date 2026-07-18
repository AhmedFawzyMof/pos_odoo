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
    odoo.execute_kw("pos.session", "get_session_summary_rpc", [[sessionId]]),
  );

  if (rpcErr) {
    throw createError({
      statusCode: 500,
      message: `RPC failed: ${rpcErr.message}`,
    });
  }

  if (rpcResult.status === "error") {
    throw createError({
      statusCode: 400,
      message: rpcResult.message || "Failed to get session summary",
    });
  }

  const financials = rpcResult.financials || {};

  return {
    success: true,
    summary: {
      session_name: rpcResult.name || "",
      orders_count: financials.total_orders_count || 0,
      total_sales: financials.total_payments_amount || 0,
      opening_cash: financials.cash_register_balance_start || 0,
      cash_balance: financials.cash_register_balance_end || 0,
      cash_movements: rpcResult.cash_movements || [],
      user_name: rpcResult.user?.name || "",
      config_name: rpcResult.config?.name || "",
      start_at: rpcResult.start_at || "",
      stop_at: rpcResult.stop_at || "",
      session_state: rpcResult.state || "",
    },
  };
});

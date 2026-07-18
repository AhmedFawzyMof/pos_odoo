import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const sessionId = parseInt(body.session_id as string, 10);
  const amount = parseFloat(body.amount as string) || 0;
  const reason = String(body.reason || "").trim();

  if (!sessionId || amount === 0 || !reason) {
    throw createError({
      statusCode: 400,
      message: "session_id, amount, and reason are required",
    });
  }

  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'pos_user')

  const [rpcErr, rpcResult] = await tryCatch(
    odoo.execute_kw("pos.session", "control_cash_movement_rpc", [
      [sessionId, amount, reason],
    ]),
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
      message: rpcResult.message || "Cash movement failed",
    });
  }

  return {
    success: true,
    new_balance: rpcResult.current_total_cash ?? 0,
    message: rpcResult.message || "Cash movement recorded successfully",
  };
});

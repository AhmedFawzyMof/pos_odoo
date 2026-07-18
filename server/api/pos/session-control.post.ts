import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from "~~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const configId = parseInt(body.config_id as string, 10);
  const action = String(body.action || "").trim();
  const openingCash = parseFloat(body.opening_cash as string) || 0.0;
  const forceClose = body.force_close === true;

  if (!configId || !["open", "close", "status"].includes(action)) {
    console.log(
      "Invalid request: config_id and action (open/close/status) required",
    );
    throw createError({
      statusCode: 400,
      message:
        "Invalid request: config_id and action (open/close/status) required",
    });
  }

  const odoo = await getAdminOdooClient();
  await requirePermission(event, "pos_user");

  const [rpcErr, rpcResult] = await tryCatch(
    odoo.execute_kw("pos.session", "control_pos_session_rpc", [
      [configId, action, openingCash, forceClose],
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
      message: rpcResult.message || "Session control failed",
      data: { draft_count: rpcResult.draft_count || 0 },
    });
  }

  return {
    success: true,
    session: rpcResult.session || null,
    message: rpcResult.message || `Session ${action} successful`,
  };
});

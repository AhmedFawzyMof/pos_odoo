import { defineEventHandler, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'pos_user')

  const [rpcErr, rpcResult] = await tryCatch(
    odoo.execute_kw("pos.config", "get_all_registers_with_status_rpc", [[]]),
  );

  if (rpcErr) {
    throw createError({
      statusCode: 500,
      message: `RPC Core Error: ${rpcErr.message}`,
    });
  }

  if (rpcResult.status === "error") {
    throw createError({
      statusCode: 400,
      message: rpcResult.message || "فشل جلب أجهزة الكاشير من النظام.",
    });
  }

  // Your Python code returns exactly { status: 'success', data: [...] }
  return {
    success: true,
    data: rpcResult.data || [],
  };
});

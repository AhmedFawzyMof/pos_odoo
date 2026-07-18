import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const name = String(body.name ?? "").trim();

  if (!name) {
    throw createError({
      statusCode: 400,
      statusMessage: "اسم الجهاز مطلوب",
    });
  }

  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'pos_user')

  // --- CLEAN FIX HERE ---
  // Call your custom Python RPC method directly instead of rebuilding it in JS
  // Wrapping 'name' inside an inner array avoids the string-unpacking TypeError
  const [rpcErr, rpcResult] = await tryCatch(
    odoo.execute_kw("pos.config", "create_new_register_rpc", [[name]]),
  );

  if (rpcErr) {
    throw createError({
      statusCode: 500,
      message: `فشل عطل في الخادم: ${rpcErr.message}`,
    });
  }

  // Handle the custom JSON structures your Python addon returns
  if (rpcResult.status === "error") {
    throw createError({
      statusCode: 400,
      message: rpcResult.message,
    });
  }

  return {
    success: true,
    config_id: rpcResult.id,
    name,
    message: rpcResult.message,
  };
});

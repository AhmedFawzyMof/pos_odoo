import { defineEventHandler, getQuery, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const configId = String(query.config_id ?? "").trim();

  if (!configId || configId === "null") {
    throw createError({
      statusCode: 400,
      statusMessage: "معرف نقطة البيع مفقود",
    });
  }

  const odoo = await getAdminOdooClient();

  const [rpcErr, rpcResult] = await tryCatch(
    odoo.execute_kw("pos.session", "control_pos_session_rpc", [
      [],
      {
        config_id: parseInt(configId, 10),
        action: "status",
      },
    ]),
  );

  if (rpcErr) {
    throw createError({
      statusCode: 500,
      message: `فشل جلب حالة الوردية: ${rpcErr.message}`,
    });
  }

  if (rpcResult.status === "error") {
    throw createError({
      statusCode: 400,
      message: rpcResult.message,
    });
  }

  return {
    success: true,
    session: rpcResult.session,
  };
});

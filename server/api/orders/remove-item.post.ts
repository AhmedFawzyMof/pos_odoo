import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requireAnyPermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const orderId = Number(body?.order_id) || 0;
  const lineId = Number(body?.line_id) || 0;

  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: "معرّف الطلب مطلوب" });
  }
  if (!lineId) {
    throw createError({
      statusCode: 400,
      statusMessage: "معرّف الصنف المطلوب حذفه مطلوب",
    });
  }

  const odoo = await getAdminOdooClient();
  await requireAnyPermission(event, ['pos_manager', 'settings_access_rights'])

  const [rpcErr, result] = await tryCatch(
    odoo.execute_kw("custom.order.api", "api_remove_order_line", [
      [],
      {
        order_id: orderId,
        line_id: lineId,
      },
    ]),
  );

  if (rpcErr) {
    throw createError({
      statusCode: 500,
      message: `فشل حذف الصنف من الطلب: ${rpcErr.message}`,
    });
  }

  if (result?.status === "error") {
    throw createError({
      statusCode: 400,
      message: result.message || "فشل حذف الصنف من الطلب",
    });
  }

  return {
    success: true,
    message: result?.message || "تم حذف الصنف من الطلب بنجاح",
    order_id: orderId,
    line_id: lineId,
  };
});

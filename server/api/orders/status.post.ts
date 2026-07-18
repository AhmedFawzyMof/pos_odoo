import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requireAnyPermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const orderId = Number(body?.order_id) || 0;
  const state = String(body?.state || "").trim();

  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: "معرّف الطلب مطلوب" });
  }
  if (!state) {
    throw createError({
      statusCode: 400,
      statusMessage: "الحالة المطلوبة مطلوبة",
    });
  }

  const validStates = [
    "draft",
    "paid",
    "done",
    "cancelled",
    "invoiced",
    "refund",
  ];
  if (!validStates.includes(state)) {
    throw createError({
      statusCode: 400,
      message: `حالة غير صالحة. الحالات المسموحة: ${validStates.join(", ")}`,
    });
  }

  const odoo = await getAdminOdooClient();
  await requireAnyPermission(event, ['pos_manager', 'settings_access_rights'])

  const [rpcErr, result] = await tryCatch(
    odoo.execute_kw("custom.order.api", "api_update_order_status", [
      [],
      {
        order_id: orderId,
        new_status: state,
      },
    ]),
  );

  if (rpcErr) {
    throw createError({
      statusCode: 500,
      message: `فشل تحديث حالة الطلب: ${rpcErr.message}`,
    });
  }

  if (result?.status === "error") {
    throw createError({
      statusCode: 400,
      message: result.message || "فشل تحديث حالة الطلب",
    });
  }

  return {
    success: true,
    message: result?.message || "تم تحديث حالة الطلب بنجاح",
    order_id: orderId,
    state,
  };
});

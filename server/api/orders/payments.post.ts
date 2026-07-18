import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requireAnyPermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const orderId = Number(body?.order_id) || 0;
  const payments = body?.payments || [];

  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: "معرّف الطلب مطلوب" });
  }
  if (!Array.isArray(payments) || payments.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "يجب توفير مدفوعات واحدة على الأقل",
    });
  }

  const sanitizedPayments = payments.map((p: any) => {
    const entry: any = {
      method_id: Number(p.method_id) || 0,
      amount: Number(p.amount) || 0,
    };
    if (p.id) {
      entry.id = Number(p.id);
    }
    return entry;
  });

  const odoo = await getAdminOdooClient();
  await requireAnyPermission(event, ['pos_manager', 'settings_access_rights'])

  const [rpcErr, result] = await tryCatch(
    odoo.execute_kw("custom.order.api", "api_register_order_payments", [
      [],
      {
        order_id: orderId,
        payments: sanitizedPayments,
      },
    ]),
  );

  if (rpcErr) {
    throw createError({
      statusCode: 500,
      message: `فشل تحديث مدفوعات الطلب: ${rpcErr.message}`,
    });
  }

  if (result?.status === "error") {
    throw createError({
      statusCode: 400,
      message: result.message || "فشل تحديث مدفوعات الطلب",
    });
  }

  return {
    success: true,
    message: result?.message || "تم تحديث مدفوعات الطلب بنجاح",
    order_id: orderId,
  };
});

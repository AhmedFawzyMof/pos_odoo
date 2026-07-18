import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'purchase_user')
  const body = await readBody(event);
  if (!body?.partner_id || !body?.lines?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "المورد والمنتجات مطلوبان",
    });
  }

  const [rpcErr, result] = await tryCatch(
    odoo.execute_kw("purchase.order.api", "create_purchase_order", [[body], {}]),
  );
  if (rpcErr) {
    throw createError({
      statusCode: 500,
      message: `فشل في إنشاء أمر الشراء: ${rpcErr.message}`,
    });
  }

  return result;
});

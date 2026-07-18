import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'purchase_user')
  const body = await readBody(event);
  if (!body?.po_id) {
    throw createError({
      statusCode: 400,
      statusMessage: "معرف أمر الشراء مطلوب",
    });
  }

  const [rpcErr, result] = await tryCatch(
    odoo.execute_kw("purchase.order.api", "update_purchase_order", [[body], {}]),
  );
  if (rpcErr) {
    throw createError({
      statusCode: 500,
      message: `فشل في تحديث أمر الشراء: ${rpcErr.message}`,
    });
  }

  return result;
});

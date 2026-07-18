import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requireAnyPermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient();
  await requireAnyPermission(event, ['stock_user', 'purchase_user'])
  const body = await readBody(event);
  if (!body?.po_id) {
    throw createError({
      statusCode: 400,
      statusMessage: "معرف أمر الشراء مطلوب",
    });
  }

  const [rpcErr, result] = await tryCatch(
    odoo.execute_kw("purchase.order.api", "reverse_receive_purchase_order", [[body], {}]),
  );
  if (rpcErr) {
    throw createError({
      statusCode: 500,
      message: `فشل في عكس الاستلام: ${rpcErr.message}`,
    });
  }

  return result;
});

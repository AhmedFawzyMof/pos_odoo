import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'account_invoice')
  const body = await readBody(event);
  if (!body?.po_id) {
    throw createError({
      statusCode: 400,
      statusMessage: "معرف أمر الشراء مطلوب",
    });
  }

  const [rpcErr, result] = await tryCatch(
    odoo.execute_kw("purchase.order.api", "create_bill_from_po", [
      [body.po_id],
      {},
    ]),
  );
  if (rpcErr) {
    throw createError({
      statusCode: 500,
      message: `فشل في إنشاء الفاتورة من أمر الشراء: ${rpcErr.message}`,
    });
  }

  return result;
});

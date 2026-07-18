import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requireAnyPermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient();
  await requireAnyPermission(event, ['account_invoice', 'account_manager'])
  const body = await readBody(event);
  if (!body?.bill_id || !body?.status) {
    throw createError({
      statusCode: 400,
      statusMessage: "معرف الفاتورة والحالة الجديدة مطلوبان",
    });
  }

  const [rpcErr, result] = await tryCatch(
    odoo.execute_kw("vendor.bill.api", "update_vendor_bill_status", [
      [body.bill_id, body.status],
    ]),
  );
  if (rpcErr) {
    throw createError({
      statusCode: 500,
      message: `فشل في تحديث حالة الفاتورة: ${rpcErr.message}`,
    });
  }

  return result;
});

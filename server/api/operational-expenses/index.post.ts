import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'purchase_user')
  const body = await readBody(event);
  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: "بيانات المصروف مطلوبة",
    });
  }

  const [rpcErr, result] = await tryCatch(
    odoo.execute_kw("operational.expense.api", "create_operational_expense", [[body]]),
  );
  if (rpcErr) {
    throw createError({
      statusCode: 500,
      message: `فشل في تسجيل المصروف: ${rpcErr.message}`,
    });
  }

  return result;
});

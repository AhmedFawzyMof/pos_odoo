import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from "~~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (!body.name?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "اسم طريقة الدفع مطلوب",
    });
  }

  const odoo = await getAdminOdooClient(event);
  await requirePermission(event, "pos_user");

  const [createErr, newId] = await tryCatch<number>(
    odoo.execute_kw("pos.payment.method", "create", [
      [{
        name: body.name.trim(),
        is_cash_count: body.is_cash_count ?? false,
      }],
    ]),
  );

  if (createErr) {
    throw createError({
      statusCode: 500,
      statusMessage: `فشل إنشاء طريقة الدفع: ${createErr.message}`,
    });
  }

  return { success: true, id: newId };
});

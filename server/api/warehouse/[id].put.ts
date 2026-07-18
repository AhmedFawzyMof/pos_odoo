import { defineEventHandler } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

const ALLOWED_USAGES = ["internal", "view", "inventory"];

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);
  const { name, barcode, usage, address } = body;

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "معرف الموقع مطلوب" });
  }

  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'stock_manager');

  const vals: Record<string, any> = {};
  if (name !== undefined) vals.name = name.trim();
  if (address !== undefined) vals.name = address.trim();
  if (barcode !== undefined) vals.barcode = barcode;
  if (usage !== undefined) {
    if (!ALLOWED_USAGES.includes(usage)) {
      throw createError({ statusCode: 400, statusMessage: "نوع الموقع غير مسموح به" });
    }
    vals.usage = usage;
  }

  if (Object.keys(vals).length === 0) {
    throw createError({ statusCode: 400, statusMessage: "لا توجد بيانات للتحديث" });
  }

  const [err] = await tryCatch(
    odoo.execute_kw("stock.location", "write", [[[Number(id)], vals]])
  );

  if (err) {
    throw createError({
      statusCode: 500,
      message: `فشل في تحديث الموقع: ${err.message}`,
    });
  }

  return { success: true, message: "تم تحديث الموقع بنجاح" };
});

import { defineEventHandler } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from "~~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "معرف الموقع مطلوب" });
  }

  await requirePermission(event, "stock_manager");
  const odoo = await getAdminOdooClient();

  const [err, result] = await tryCatch(
    odoo.execute_kw("warehouse.location.api", "delete_location", [[Number(id)]]),
  );

  if (err) {
    throw createError({
      statusCode: 500,
      message: `فشل في حذف الموقع: ${err.message}`,
    });
  }

  const res = result as any;
  if (!res.success) {
    throw createError({
      statusCode: 400,
      statusMessage: res.message,
    });
  }

  return { success: true, message: res.message };
});

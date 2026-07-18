import { defineEventHandler, getQuery, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const supplierId = query.id as string;
  if (!supplierId) {
    throw createError({ statusCode: 400, statusMessage: "معرف المورد مطلوب" });
  }

  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'purchase_user')
  const [rpcErr, result] = await tryCatch(
    odoo.execute_kw("res.partner", "get_supplier_detail", [[supplierId]]),
  );
  if (rpcErr) throw rpcErr;
  return result;
});

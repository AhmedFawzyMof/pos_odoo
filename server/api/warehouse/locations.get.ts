import { defineEventHandler } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'stock_user')

  const [err, rawLocations] = await tryCatch(
    odoo.execute_kw("warehouse.location.api", "get_locations_with_capacity", [
      [],
    ]),
  );

  if (err) {
    throw createError({
      statusCode: 500,
      message: `فشل في جلب المواقع: ${err.message}`,
    });
  }

  const locations = rawLocations as any[];

  return {
    success: true,
    data: locations.filter((loc) => !loc.partner_id && !loc.is_virtual),
  };
});

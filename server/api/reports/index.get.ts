import { defineEventHandler, getQuery } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const { type, date_from, date_to, ...filters } = getQuery(event);

  if (!type) {
    throw createError({
      statusCode: 400,
      statusMessage: "Report type is required",
    });
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const defaultDateFrom = date_from || todayStr;
  const defaultDateTo = date_to || todayStr;

  // Pass the user's active company to Odoo for proper data isolation
  const session = await requireUserSession(event);
  const companyId = (session as any)?.currentCompanyId;
  const odoo = await getAdminOdooClient(companyId || undefined);
  await requirePermission(event, 'pos_user')

  const [rpcErr, data] = await tryCatch(
    odoo.execute_kw("pos.reports.api", "get_report_data", [
      [type as string, defaultDateFrom, defaultDateTo, filters],
    ]),
  );
  if (rpcErr) {
    throw createError({
      statusCode: 500,
      message: `فشل في جلب التقرير: ${rpcErr.message}`,
    });
  }

  return { success: true, ...(data as any) };
});

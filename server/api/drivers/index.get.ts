import { defineEventHandler, getQuery, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from "~~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const paramsPayload = {
    page: (query.page as string) || "1",
    search: (query.search as string) || "",
  };

  const odoo = await getAdminOdooClient();
  await requirePermission(event, "pos_user");

  const [rpcErr, result] = await tryCatch(
    odoo.execute_kw("res.partner", "get_pos_frontend_drivers", [
      [],
      { params: paramsPayload },
    ]),
  );

  if (rpcErr) throw rpcErr;

  return result;
});

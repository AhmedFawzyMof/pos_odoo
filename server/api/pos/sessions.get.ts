import { defineEventHandler, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pos_user')

  const odoo = await getAdminOdooClient();

  const [err, sessions] = await tryCatch(
    odoo.execute_kw("pos.session", "search_read", [
      [[]],
      {
        fields: ["id", "name", "state", "user_id", "config_id", "start_at", "stop_at", "order_count"],
        order: "id desc",
        limit: 100,
      },
    ]),
  );
  if (err) {
    throw createError({ statusCode: 500, message: `search_read failed: ${err.message}` });
  }

  const result = (sessions || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    config: s.config_id?.[1] || "",
    user: s.user_id?.[1] || "",
    state: s.state,
    start_at: s.start_at || "",
    stop_at: s.stop_at || "",
    order_count: s.order_count || 0,
  }));

  return { success: true, data: result };
});

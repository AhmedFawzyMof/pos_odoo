import { defineEventHandler, readBody, createError, getQuery } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from "~~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  await requirePermission(event, "pos_user");

  const method = event.method;
  let sessionId: number | null = null;

  if (method === "GET") {
    const query = getQuery(event);
    sessionId = query.session_id ? parseInt(query.session_id as string, 10) : null;
  } else {
    const body = await readBody(event);
    sessionId = body.session_id ? parseInt(body.session_id, 10) : null;
  }

  if (!sessionId) {
    throw createError({ statusCode: 400, message: "session_id is required" });
  }

  const odoo = await getAdminOdooClient();
  const [rpcErr, result] = await tryCatch(
    odoo.execute_kw("pos.reports.api", "get_report_data", [
      ["close_session", null, null, { session_id: sessionId }],
    ]),
  );

  if (rpcErr) {
    throw createError({ statusCode: 500, message: `RPC failed: ${rpcErr.message}` });
  }

  if (result?.status === "error") {
    throw createError({ statusCode: 400, message: result.message });
  }

  return { success: true, message: result.message };
});

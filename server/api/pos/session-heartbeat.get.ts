import { defineEventHandler, getQuery, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const configId = String(query.config_id ?? "").trim();
  const sessionId = Number(query.session_id) || 0;

  if (!configId || configId === "null") {
    throw createError({ statusCode: 400, statusMessage: "config_id is required" });
  }

  const odoo = await getAdminOdooClient(event);

  const [rpcErr, rpcResult] = await tryCatch(
    odoo.execute_kw("pos.session", "control_pos_session_rpc", [
      [],
      {
        config_id: parseInt(configId, 10),
        action: "status",
      },
    ]),
  );

  if (rpcErr) {
    return { active: false, session_id: null, error: rpcErr.message };
  }

  if (rpcResult?.status === "error") {
    return { active: false, session_id: null, state: "error", error: rpcResult.message };
  }

  const session = rpcResult?.session;

  if (!session?.session_id) {
    return { active: false, session_id: null, state: "no_session" };
  }

  const active = session.state !== "closed" && Number(session.session_id) === sessionId;

  return {
    active,
    session_id: Number(session.session_id) || null,
    state: session.state || "unknown",
  };
});

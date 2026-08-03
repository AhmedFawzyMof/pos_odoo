import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from "~~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient();
  await requirePermission(event, "pos_user");
  const body = await readBody(event);
  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: "بيانات السائق مطلوبة",
    });
  }

  const paramsPayload = {
    id: body.id,
    name: body.name,
    email: body.email,
    phone: body.phone,
  };

  const [rpcErr, result] = await tryCatch(
    odoo.execute_kw("res.partner", "create_pos_frontend_driver", [
      [],
      { params: paramsPayload },
    ]),
  );

  if (rpcErr) {
    throw createError({
      statusCode: 500,
      message: `فشل في حفظ بيانات السائق: ${rpcErr.message}`,
    });
  }

  if (!result?.success) {
    throw createError({
      statusCode: 400,
      statusMessage: result?.message || "فشل في حفظ بيانات السائق",
    });
  }

  return result;
});

import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'pos_user')

  const body = await readBody(event);
  const session = await getUserSession(event);
  const uid = (session.user as any).odooUserId;
  const userVals: Record<string, any> = {};

  if (body.lang) {
    userVals.lang = body.lang;
  }
  if (body.tz) {
    userVals.tz = body.tz;
  }

  if (Object.keys(userVals).length > 0) {
    const [writeErr] = await tryCatch(
      odoo.execute_kw("res.users", "write", [[[uid], userVals]]),
    );
    if (writeErr) throw writeErr;
  }

  if (body.avatar && body.partnerId) {
    const [avatarErr] = await tryCatch(
      odoo.execute_kw("res.partner", "write", [
        [[body.partnerId], { image_1920: body.avatar }],
      ]),
    );
    if (avatarErr) throw avatarErr;
  }

  return { success: true, message: "Profile updated successfully" };
});

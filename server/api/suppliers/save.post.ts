import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'purchase_user')
  const body = await readBody(event);
  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: "بيانات المورد مطلوبة",
    });
  }

  const partnerVals: Record<string, any> = {
    supplier_rank: 1,
    is_company: true,
  };
  if (body.name) partnerVals.name = body.name;
  if (body.email) partnerVals.email = body.email;
  if (body.phone) {
    partnerVals.phone = body.phone;
    partnerVals.mobile = body.phone;
  }
  if (body.street) partnerVals.street = body.street;
  if (body.city) partnerVals.city = body.city;
  if (body.vat) partnerVals.vat = body.vat;
  if (body.payment_term_id) {
    partnerVals.property_supplier_payment_term_id = parseInt(
      body.payment_term_id as string,
      10,
    );
  }

  let partnerId: number;

  if (body.id) {
    const [writeErr] = await tryCatch(
      odoo.execute_kw("res.partner", "write", [[[body.id, partnerVals]]]),
    );
    if (writeErr) {
      throw createError({
        statusCode: 500,
        message: `فشل في تحديث بيانات المورد: ${writeErr.message}`,
      });
    }
    partnerId = body.id;
  } else {
    const [createErr, newId] = await tryCatch(
      odoo.execute_kw("res.partner", "create", [[partnerVals]]),
    );
    if (createErr) {
      throw createError({
        statusCode: 500,
        message: `فشل في إنشاء المورد: ${createErr.message}`,
      });
    }
    partnerId = newId as number;
  }

  return {
    success: true,
    id: partnerId,
    message: body.id ? "تم تحديث بيانات المورد بنجاح" : "تم إنشاء المورد بنجاح",
  };
});

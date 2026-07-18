import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'pos_manager')

  const body = await readBody(event);

  const companyVals: Record<string, any> = {};
  if (body.name) companyVals.name = body.name;
  if (body.companyRegistry !== undefined) {
    companyVals.company_registry = body.companyRegistry;
  }

  if (body.logo) {
    companyVals.logo_web = body.logo;
  }

  if (Object.keys(companyVals).length > 0 && body.companyId) {
    const [writeErr] = await tryCatch(
      odoo.execute_kw("res.company", "write", [
        [[body.companyId], companyVals],
      ]),
    );
    if (writeErr) throw writeErr;
  }

  if (body.partnerId) {
    const partnerVals: Record<string, any> = {};
    for (const field of [
      "email",
      "phone",
      "website",
      "street",
      "street2",
      "city",
      "zip",
    ]) {
      if (body[field] !== undefined) {
        partnerVals[field] = body[field];
      }
    }
    if (body.stateId) partnerVals.state_id = Number(body.stateId);
    if (body.countryId) partnerVals.country_id = Number(body.countryId);
    if (body.vat !== undefined) partnerVals.vat = body.vat;

    if (Object.keys(partnerVals).length > 0) {
      const [writeErr] = await tryCatch(
        odoo.execute_kw("res.partner", "write", [
          [[body.partnerId], partnerVals],
        ]),
      );
      if (writeErr) throw writeErr;
    }
  }

  return { success: true, message: "Company profile updated successfully" };
});

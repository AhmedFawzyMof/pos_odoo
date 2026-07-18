import { defineEventHandler, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'pos_user')

  const session = await getUserSession(event);
  const [userErr, userData] = await tryCatch(
    odoo.read("res.users", (session.user as any).odooUserId, ["company_id"]),
  );
  if (userErr) throw userErr;

  const companyId = (userData[0] as any).company_id?.[0];
  if (!companyId) {
    throw createError({ statusCode: 404, statusMessage: "Company not found" });
  }

  const [companyErr, companyData] = await tryCatch(
    odoo.read("res.company", companyId, [
      "name",
      "partner_id",
      "company_registry",
      "logo_web",
      "logo",
    ]),
  );
  if (companyErr) throw companyErr;

  const company: any = companyData?.[0];
  if (!company) {
    throw createError({ statusCode: 404, statusMessage: "Company not found" });
  }

  const partnerId = company.partner_id?.[0];
  let partner: Record<string, any> = {};
  if (partnerId) {
    const [partnerErr, partnerData] = await tryCatch(
      odoo.read("res.partner", partnerId, [
        "email",
        "phone",
        "website",
        "street",
        "street2",
        "city",
        "state_id",
        "zip",
        "country_id",
        "vat",
      ]),
    );
    if (!partnerErr && partnerData?.[0]) {
      partner = partnerData[0];
    }
  }

  let states: any[] = [];
  const [statesErr, statesData] = await tryCatch(
    odoo.searchRead("res.country.state", [], ["id", "name", "country_id"], {
      order: "name",
    }),
  );
  if (!statesErr) states = statesData || [];

  let countries: any[] = [];
  const [countriesErr, countriesData] = await tryCatch(
    odoo.searchRead("res.country", [], ["id", "name"], { order: "name" }),
  );
  if (!countriesErr) countries = countriesData || [];

  return {
    success: true,
    data: {
      id: company.id,
      name: company.name,
      partnerId,
      companyRegistry: company.company_registry,
      logo: company.logo_web || company.logo,
      email: partner.email || "",
      phone: partner.phone || "",
      website: partner.website || "",
      street: partner.street || "",
      street2: partner.street2 || "",
      city: partner.city || "",
      stateId: partner.state_id?.[0] || null,
      zip: partner.zip || "",
      countryId: partner.country_id?.[0] || null,
      vat: partner.vat || "",
    },
    states,
    countries,
  };
});

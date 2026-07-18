import { defineEventHandler, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'
import { getDb } from "~~/server/db";

const DEFAULT_CONFIG = {
  receipt: {
    titleAr: "فاتورة بيع",
    titleEn: "SALES INVOICE",
    fontFamily: "Courier New, monospace",
    fontSize: 12,
    width: 280,
    header: {
      enabled: true,
      companyName: true,
      companyLogo: true,
      companyAddress: true,
      companyPhone: true,
      companyEmail: true,
      companyWebsite: true,
      companyVat: true,
      showQrCode: false,
      qrCodeText: "",
    },
    items: {
      enabled: true,
      showDescription: true,
      showPrice: true,
      showQuantity: true,
      showTotal: true,
      showDiscount: true,
      showTax: false,
    },
    payments: {
      enabled: true,
      showMethod: true,
      showAmount: true,
      showChange: false,
    },
    totals: {
      enabled: true,
      showSubtotal: true,
      showDiscount: true,
      showServiceFee: true,
      showTax: true,
      showGrandTotal: true,
      currency: "ج.م",
    },
    footer: {
      enabled: true,
      showThankYou: true,
      thankYouText: "شكراً لتسوقكم معنا",
      showOrderNumber: true,
      showDate: true,
      showTime: true,
      showCashier: false,
      showTerms: false,
      termsText: "",
    },
    colors: {
      primary: "#000000",
      secondary: "#333333",
      accent: "#666666",
      text: "#000000",
      background: "#ffffff",
    },
    layout: {
      headerStyle: "standard",
      footerStyle: "standard",
      showDivider: true,
      dividerStyle: "dashed",
      showBorder: true,
      borderStyle: "solid",
    },
  },
};

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'pos_manager')

  const session = await getUserSession(event);
  const [userErr, userData] = await tryCatch(
    odoo.read("res.users", (session.user as any).odooUserId, ["company_id"]),
  );
  if (userErr) throw userErr;

  const companyId = (userData[0] as any).company_id?.[0];
  if (!companyId) {
    throw createError({ statusCode: 404, statusMessage: "Company not found" });
  }

  const db = getDb();
  let savedConfig = {};
  try {
    const row = db.prepare('SELECT config FROM receipt_configs WHERE company_id = ?').get(companyId) as any;
    if (row) {
      try {
        savedConfig = JSON.parse(row.config);
      } catch { }
    }
  } catch (dbError) {
    console.error('Database error reading receipt config:', dbError);
  }

  const company: Record<string, any> = {};
  if (companyId) {
    const [companyErr, companyData] = await tryCatch(
      odoo.read("res.company", companyId, [
        "name",
        "partner_id",
        "company_registry",
        "logo_web",
        "logo",
      ]),
    );
    if (!companyErr && companyData?.[0]) {
      const c: any = companyData[0];
      company.id = c.id;
      company.name = c.name;
      company.companyRegistry = c.company_registry;
      company.logo = c.logo_web || c.logo;
      company.partner_id = c.partner_id;
    }
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

  const data = {
    company: {
      id: company.id || null,
      name: company.name || "",
      companyRegistry: company.companyRegistry || "",
      logo: company.logo || null,
      email: partner.email || "",
      phone: partner.phone || "",
      website: partner.website || "",
      vat: partner.vat || "",
      address: {
        street: partner.street || "",
        street2: partner.street2 || "",
        city: partner.city || "",
        stateId: partner.state_id?.[0] || null,
        zip: partner.zip || "",
        countryId: partner.country_id?.[0] || null,
      },
    },
    receipt: (savedConfig as any).receipt || DEFAULT_CONFIG.receipt,
  };

  return {
    success: true,
    data,
    states,
    countries,
  };
});

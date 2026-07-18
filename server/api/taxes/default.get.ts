import { defineEventHandler, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'pos_user')

  const [taxesError, taxesData] = await tryCatch(
    odoo.searchRead(
      "account.tax",
      [
        ["type_tax_use", "=", "sale"],
        ["amount", ">", 0],
      ],
      ["id", "name", "amount", "amount_type", "price_include"],
      { limit: 1 },
    ),
  );

  if (taxesError || taxesData.length === 0) {
    return { success: true, tax: null };
  }

  return {
    success: true,
    tax: {
      id: (taxesData as any)[0].id,
      name: (taxesData as any)[0].name,
      amount: (taxesData as any)[0].amount,
      amount_type: (taxesData as any)[0].amount_type || "percent",
      price_include: (taxesData as any)[0].price_include || false,
    },
  };
});

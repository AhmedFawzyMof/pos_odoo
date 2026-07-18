import { defineEventHandler, getQuery, createError } from "h3";
import { tryCatch } from "~~/server/utils/tryCatch";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'pos_user')

  const query = getQuery(event);
  const searchQuery = ((query.query as string) || "").trim();
  const locationId = query.locationId
    ? parseInt(query.locationId as string, 10)
    : null;
  const includeZeroQty = query.includeZeroQty === 'true';

  if (!searchQuery) {
    return { success: true, data: [] };
  }

  const domain: any[] = [
    "|",
    ["name", "ilike", searchQuery],
    "|",
    ["barcode", "ilike", searchQuery],
    ["default_code", "ilike", searchQuery],
  ];

  const [searchErr, products] = await tryCatch(
    odoo.execute_kw("product.product", "search_read", [
      [domain],
      {
        fields: ["id", "name", "barcode", "standard_price", "lst_price", "taxes_id"],
      },
    ]),
  );

  if (searchErr) {
    throw createError({
      statusCode: 500,
      message: `فشل في البحث عن المنتجات: ${searchErr.message}`,
    });
  }

  const productIds = products.map((p: any) => p.id);
  let quantitiesByProduct: Record<number, number> = {};

  if (locationId && productIds.length > 0) {
    const [quantErr, quants] = await tryCatch(
      odoo.searchRead(
        "stock.quant",
        [
          ["product_id", "in", productIds],
          ["location_id", "=", locationId],
        ],
        ["product_id", "quantity"],
      ),
    );

    if (!quantErr && quants) {
      for (const q of quants) {
        const pid = Array.isArray((q as any).product_id)
          ? (q as any).product_id[0]
          : (q as any).product_id;
        quantitiesByProduct[pid] = (q as any).quantity || 0;
      }
    }
  }

  const data = products
    .map((p: any) => {
      const qty = quantitiesByProduct[p.id] ?? 0;
      const rawTaxes = p.taxes_id || [];
      const taxIds = rawTaxes
        .map((t: any) => (Array.isArray(t) ? Number(t[0]) : Number(t)))
        .filter((id: number) => id > 0);
      return {
        id: p.id,
        name: p.name,
        barcode: p.barcode || "",
        standard_price: p.standard_price || 0,
        list_price: p.lst_price || 0,
        taxes_id: taxIds,
        quantity: locationId ? qty : undefined,
      };
    })
    .filter((p: any) => !locationId || includeZeroQty || p.quantity > 0);

  return { success: true, data };
});

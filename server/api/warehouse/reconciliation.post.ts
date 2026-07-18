import { defineEventHandler, createError, readBody } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { requirePermission } from "~~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { locationId, items } = body;

  if (!locationId) {
    throw createError({
      statusCode: 400,
      statusMessage: "موقع المخزون مطلوب",
    });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "قائمة مواد التسوية فارغة",
    });
  }

  const odoo = await getAdminOdooClient();
  await requirePermission(event, "stock_user");

  const quantUpdates = [];
  for (const item of items) {
    const { productId, countedQuantity } = item;

    if (!productId || countedQuantity === undefined || countedQuantity === null) {
      continue;
    }

    const productData = await odoo.searchRead(
      "product.product",
      [["id", "=", Number(productId)]],
      ["uom_id"]
    );

    if (!productData || productData.length === 0) {
      continue;
    }

    const uomId = productData[0].uom_id[0] || 1;

    const quants = await odoo.searchRead(
      "stock.quant",
      [
        ["product_id", "=", Number(productId)],
        ["location_id", "=", Number(locationId)],
      ],
      ["id", "quantity"],
      1
    );

    let quantId: number;
    if (quants.length > 0) {
      quantId = quants[0].id;
    } else {
      quantId = await odoo.execute_kw("stock.quant", "create", [
        {
          product_id: Number(productId),
          location_id: Number(locationId),
          inventory_quantity: Number(countedQuantity),
        },
      ]);
    }

    await odoo.execute_kw("stock.quant", "write", [
      [[quantId], { inventory_quantity: Number(countedQuantity) }],
    ]);

    await odoo.execute_kw("stock.quant", "action_apply_inventory", [[quantId]]);

    quantUpdates.push({
      productId: Number(productId),
      countedQuantity: Number(countedQuantity),
      quantId,
    });
  }

  return {
    success: true,
    processedCount: quantUpdates.length,
    updates: quantUpdates,
  };
});
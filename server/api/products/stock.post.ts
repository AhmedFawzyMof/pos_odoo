import { defineEventHandler, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const ids: number[] = body?.ids || [];
  if (!ids.length) {
    return { success: true, stockMap: {} };
  }

  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'pos_user')

  const [templates, locations] = await Promise.all([
    odoo.searchRead(
      "product.template",
      [["id", "in", ids]],
      ["id", "product_variant_ids"],
    ),
    odoo.searchRead(
      "stock.location",
      [["usage", "=", "internal"]],
      ["id", "name"],
    ),
  ]);

  const variantIds: number[] = [];
  const templateToVariants: Record<number, number[]> = {};
  for (const tmpl of templates as any[]) {
    const vids = (tmpl.product_variant_ids || []).map((v: any) =>
      Array.isArray(v) ? v[0] : v
    );
    templateToVariants[tmpl.id] = vids;
    for (const vid of vids) {
      if (!variantIds.includes(vid)) variantIds.push(vid);
    }
  }

  const locationMap: Record<number, string> = {};
  for (const loc of locations) locationMap[(loc as any).id] = (loc as any).name;

  let stockLocationsMap: Record<number, { location_id: number; location_name: string; qty: number }[]> = {};

  if (variantIds.length > 0) {
    const [products, quants] = await Promise.all([
      odoo.searchRead(
        "product.product",
        [["id", "in", variantIds]],
        ["id", "qty_available"],
      ),
      odoo.searchRead(
        "stock.quant",
        [["product_id", "in", variantIds]],
        ["product_id", "location_id", "quantity"],
      ),
    ]);

    const qtyMap: Record<number, number> = {};
    for (const p of products as any[])
      qtyMap[p.id] = p.qty_available || 0;

    const variantStockLocs: Record<number, { location_id: number; location_name: string; qty: number }[]> = {};
    for (const q of quants as any[]) {
      const pid = Array.isArray(q.product_id) ? q.product_id[0] : q.product_id;
      const lid = Array.isArray(q.location_id) ? q.location_id[0] : q.location_id;
      if (lid && locationMap[lid]) {
        if (!variantStockLocs[pid]) variantStockLocs[pid] = [];
        variantStockLocs[pid].push({
          location_id: lid,
          location_name: locationMap[lid],
          qty: q.quantity || 0,
        });
      }
    }

    for (const [tmplId, vids] of Object.entries(templateToVariants)) {
      const merged: Record<number, { location_id: number; location_name: string; qty: number }> = {};
      for (const vid of vids) {
        const locs = variantStockLocs[vid] || [];
        for (const loc of locs) {
          const entry = merged[loc.location_id];
          if (!entry) {
            merged[loc.location_id] = { ...loc };
          } else {
            entry.qty += loc.qty;
          }
        }
      }
      stockLocationsMap[Number(tmplId)] = Object.values(merged);
    }
  }

  const stockMap: Record<number, any> = {};
  for (const id of ids) {
    stockMap[id] = {
      qty_available: stockLocationsMap[id]
        ? stockLocationsMap[id].reduce((sum, sl) => sum + sl.qty, 0)
        : 0,
      stock_locations: stockLocationsMap[id] || [],
    };
  }

  return { success: true, stockMap };
});

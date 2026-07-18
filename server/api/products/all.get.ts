import { defineEventHandler } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const page = Math.max(1, parseInt((query.page as string) || "1"));
  const limit = query.limit ? parseInt(query.limit as string, 10) : 28;
  const offset = (page - 1) * limit;

  const archiveFilter = (query.archiveFilter as string) || "all";
  const searchText = (query.search as string) || "";
  const locationId = query.locationId ? parseInt(query.locationId as string, 10) : null;
  const categoryId = query.categoryId ? parseInt(query.categoryId as string, 10) : null;
  const negativeStock = query.negativeStock === "true";

  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'pos_user')

  const baseDomain: any[] = [["id", "not in", [1, 2, 3]]];
  if (archiveFilter === "active") {
    baseDomain.push(["active", "=", true]);
  } else if (archiveFilter === "archived") {
    baseDomain.push(["active", "=", false]);
  }
  if (categoryId) {
    baseDomain.push(["pos_categ_ids", "=", categoryId]);
  }
  if (searchText) {
    baseDomain.push("|", "|");
    baseDomain.push(["name", "ilike", searchText]);
    baseDomain.push(["barcode", "ilike", searchText]);
    baseDomain.push(["default_code", "ilike", searchText]);
  }
  if (negativeStock && !locationId) {
    baseDomain.push(["qty_available", "<", 0]);
  }

  const odooContext = { active_test: false };

  const templateFields = [
    "id",
    "name",
    "display_name",
    "barcode",
    "type",
    "categ_id",
    "list_price",
    "standard_price",
    "qty_available",
    "virtual_available",
    "incoming_qty",
    "outgoing_qty",
    "weight",
    "volume",
    "sale_ok",
    "purchase_ok",
    "active",
    "available_in_pos",
    "pos_categ_ids",
    "image_1920",
    "taxes_id",
    "to_weight",
    "product_variant_ids",
  ];

  const [totalCount, categoriesData, locationsData, taxesData, templates] =
    await Promise.all([
      odoo.execute_kw("product.template", "search_count", [
        [baseDomain],
        { context: odooContext },
      ]),
      odoo.searchRead("pos.category", [], ["id", "name"]),
      odoo.searchRead(
        "stock.location",
        [["usage", "=", "internal"]],
        ["id", "name"],
      ),
      odoo.searchRead(
        "account.tax",
        [["type_tax_use", "=", "sale"]],
        ["id", "name", "amount", "amount_type", "price_include"],
      ),
      odoo.searchRead(
        "product.template",
        baseDomain,
        templateFields,
        {
          limit,
          offset,
          order: "id desc",
          context: odooContext,
        },
      ),
    ]);

  const categoryMap: Record<number, string> = {};
  for (const cat of categoriesData)
    categoryMap[(cat as any).id] = (cat as any).name;

  const locationMap: Record<number, string> = {};
  for (const loc of locationsData)
    locationMap[(loc as any).id] = (loc as any).name;

  const taxMap: Record<
    number,
    {
      id: number;
      name: string;
      amount: number;
      amount_type?: string;
      price_include?: boolean;
    }
  > = {};
  for (const tax of taxesData as any[]) taxMap[tax.id] = tax;

  const allVariantIds: number[] = [];
  for (const tmpl of templates) {
    const variantIds = (tmpl as any).product_variant_ids || [];
    for (const vid of variantIds) {
      const id = Array.isArray(vid) ? vid[0] : vid;
      if (id && !allVariantIds.includes(id)) {
        allVariantIds.push(id);
      }
    }
  }

  let variantDetails: Record<number, any> = {};
  let variantStockLocations: Record<
    number,
    { location_id: number; location_name: string; qty: number }[]
  > = {};

  if (allVariantIds.length > 0) {
    const quantDomain: any[] = [["product_id", "in", allVariantIds]];
    if (locationId) {
      quantDomain.push(["location_id", "=", locationId]);
    }

    const [variants, quants] = await Promise.all([
      odoo.searchRead(
        "product.product",
        [["id", "in", allVariantIds]],
        ["id", "display_name", "barcode", "lst_price", "price_extra", "standard_price", "product_template_attribute_value_ids"],
      ),
      odoo.searchRead(
        "stock.quant",
        quantDomain,
        ["product_id", "location_id", "quantity"],
      ),
    ]);

    for (const v of variants) {
      variantDetails[(v as any).id] = v;
    }

    for (const q of quants) {
      const pid = Array.isArray((q as any).product_id)
        ? (q as any).product_id[0]
        : (q as any).product_id;
      const lid = Array.isArray((q as any).location_id)
        ? (q as any).location_id[0]
        : (q as any).location_id;
      if (lid && locationMap[lid]) {
        if (!variantStockLocations[pid]) variantStockLocations[pid] = [];
        variantStockLocations[pid].push({
          location_id: lid,
          location_name: locationMap[lid],
          qty: (q as any).quantity || 0,
        });
      }
    }
  }

  let locationQuantMap: Record<number, number> = {};
  if (locationId && allVariantIds.length > 0) {
    const locationQuants = await odoo.searchRead(
      "stock.quant",
      [
        ["product_id", "in", allVariantIds],
        ["location_id", "=", locationId],
      ],
      ["product_id", "quantity"],
    );
    for (const q of locationQuants) {
      const pid = Array.isArray((q as any).product_id)
        ? (q as any).product_id[0]
        : (q as any).product_id;
      locationQuantMap[pid] = (locationQuantMap[pid] || 0) + ((q as any).quantity || 0);
    }
  }

  const completeProducts = templates.map((tmpl: any) => {
    const resolvedPosCategories = (tmpl.pos_categ_ids || []).map(
      (catId: any) => ({
        id: Array.isArray(catId) ? catId[0] : catId,
        name:
          categoryMap[Array.isArray(catId) ? catId[0] : catId] ||
          "Unknown Category",
      }),
    );

    const rawTaxesId = tmpl.taxes_id || [];
    const resolvedTaxes = rawTaxesId
      .reduce((acc: number[], t: any) => {
        const id = Array.isArray(t) ? Number(t[0]) : Number(t);
        if (id > 0) acc.push(id);
        return acc;
      }, [])
      .map((id: number) => taxMap[id])
      .filter(Boolean);

    const variantIds: number[] = (tmpl.product_variant_ids || []).map(
      (vid: any) => (Array.isArray(vid) ? vid[0] : vid)
    );
    const product_variant_ids = variantIds
      .map((vid: number) => {
        const det = variantDetails[vid];
        if (!det) return null;
        return {
          id: det.id,
          display_name: det.display_name || det.name,
          barcode: det.barcode || "",
          lst_price: det.lst_price || 0,
          price_extra: det.price_extra || 0,
          standard_price: det.standard_price || 0,
          product_template_attribute_value_ids: det.product_template_attribute_value_ids || [],
          stock_locations: variantStockLocations[vid] || [],
        };
      })
      .filter(Boolean);

    const allStockLocs = product_variant_ids.flatMap(
      (v: any) => v.stock_locations || []
    );
    const mergedStockLocs = Object.values(
      allStockLocs.reduce((acc: any, sl: any) => {
        if (!acc[sl.location_id]) {
          acc[sl.location_id] = { ...sl };
        } else {
          acc[sl.location_id].qty += sl.qty;
        }
        return acc;
      }, {} as Record<number, { location_id: number; location_name: string; qty: number }>)
    ) as { location_id: number; location_name: string; qty: number }[];

    const firstLoc = mergedStockLocs[0];

    const firstVariant = variantIds.length > 0 ? variantDetails[variantIds[0]] : null;

    let qtyAvailable = tmpl.qty_available || 0;
    if (locationId) {
      const totalAtLocation = variantIds.reduce((sum, vid) => {
        return sum + (locationQuantMap[vid] || 0);
      }, 0);
      qtyAvailable = totalAtLocation;
    }

    return {
      ...tmpl,
      list_price: tmpl.list_price || 0,
      barcode: tmpl.barcode || (firstVariant ? firstVariant.barcode : ""),
      qty_available: qtyAvailable,
      standard_price: tmpl.standard_price || 0,
      product_variant_ids,
      pos_categories: resolvedPosCategories,
      taxes_id: resolvedTaxes.map((t: any) => t.id),
      taxes: resolvedTaxes,
      internal_category: tmpl.categ_id
        ? { id: tmpl.categ_id[0], name: tmpl.categ_id[1] }
        : null,
      location:
        firstLoc
          ? { id: firstLoc.location_id, name: firstLoc.location_name }
          : null,
      stock_locations: locationId
        ? mergedStockLocs.filter((l) => l.location_id === locationId)
        : mergedStockLocs,
    };
  });

  return {
    success: true,
    totalItems: totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
    itemsPerPage: limit,
    data: completeProducts,
    categories: (categoriesData as any[]).map((cat) => ({
      id: cat.id,
      name: cat.name,
    })),
    locations: (locationsData as any[]).map((loc) => ({
      id: loc.id,
      name: loc.name,
    })),
  };
});

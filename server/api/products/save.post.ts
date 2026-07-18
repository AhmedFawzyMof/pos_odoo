async function odooWrite(
  odoo: any,
  model: string,
  ids: number[],
  values: object,
): Promise<boolean> {
  return await odoo.execute_kw(model, "write", [[ids, values], {}]);
}
import { requirePermission } from '~~/server/utils/permissions'
import { tryCatch } from '~~/server/utils/tryCatch'

async function safeSearchRead(
  odoo: any,
  model: string,
  domain: any[],
  fields: string[],
  limit = 0,
) {
  const params: any[] = [domain, fields];
  if (limit) params.push(0, limit);
  return await odoo.execute_kw(model, "search_read", [params]);
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'pos_manager')

  try {
    const isEditMode = !!body.id;

    // ── Barcode uniqueness check ────────────────────────────────────────
    const submittedBarcode = body.barcode?.trim();
    if (submittedBarcode) {
      const [barcodeErr, barcodeResults] = await tryCatch(
        safeSearchRead(
          odoo,
          "product.product",
          [["barcode", "=", submittedBarcode]],
          ["id", "product_tmpl_id"],
        ),
      );
      if (!barcodeErr && barcodeResults?.length > 0) {
        if (!isEditMode) {
          throw createError({
            statusCode: 400,
            statusMessage: `الباركود "${submittedBarcode}" مستخدم بالفعل لمنتج آخر`,
          });
        }
        // In edit mode, only reject if the barcode belongs to a different template
        const currentTemplateId = body.id;
        const isOwn = barcodeResults.some(
          (r: any) => Number(r.product_tmpl_id?.[0] || r.product_tmpl_id) === currentTemplateId,
        );
        if (!isOwn) {
          throw createError({
            statusCode: 400,
            statusMessage: `الباركود "${submittedBarcode}" مستخدم بالفعل لمنتج آخر`,
          });
        }
      }
    }

    const productValues: any = {
      name: body.name,
      pos_categ_ids: body.pos_categ_ids?.length
        ? [[6, 0, body.pos_categ_ids.map(Number)]]
        : [],
      barcode: body.barcode || false,
      type: ["consu", "service"].includes(body.type) ? body.type : "consu",
      list_price: isNaN(Number(body.list_price))
        ? 0.0
        : Number(body.list_price),
      standard_price: isNaN(Number(body.standard_price))
        ? 0.0
        : Number(body.standard_price),
      weight: isNaN(Number(body.weight)) ? 0.0 : Number(body.weight),
      volume: isNaN(Number(body.volume)) ? 0.0 : Number(body.volume),
      sale_ok: Boolean(body.sale_ok),
      purchase_ok: Boolean(body.purchase_ok),
      active: Boolean(body.active),
      available_in_pos: Boolean(body.available_in_pos),
      to_weight: Boolean(body.to_weight),
      taxes_id: body.taxes_id?.length
        ? [[6, 0, body.taxes_id.map(Number)]]
        : [[5, 0, 0]],
      is_storable: true,
    };

    if (body.image_1920 !== undefined) {
      if (body.image_1920) {
        const match = body.image_1920.match(/^data:image\/\w+;base64,(.+)$/);
        productValues.image_1920 = match ? match[1] : body.image_1920;
      } else {
        productValues.image_1920 = false;
      }
    }

    let templateId: number;

    if (isEditMode) {
      const tmplSearch = await safeSearchRead(
        odoo,
        "product.template",
        [["id", "=", body.id]],
        ["id"],
      );

      if (tmplSearch.length > 0) {
        templateId = body.id;
      } else {
        const currentProducts: any = await safeSearchRead(
          odoo,
          "product.product",
          [["id", "=", body.id]],
          ["product_tmpl_id"],
        );

        if (!currentProducts || currentProducts.length === 0) {
          throw createError({
            statusCode: 404,
            statusMessage: "المنتج غير موجود بالنظام",
          });
        }

        templateId = currentProducts[0].product_tmpl_id[0];
      }

      await odooWrite(odoo, "product.template", [templateId], productValues);
    } else {
      templateId = await odoo.execute_kw("product.template", "create", [
        [productValues],
      ]);
    }

    // Propagate standard_price to all product variants so the cost change
    // persists when read back (all.get.ts computes cost from variant records).
    if (body.standard_price !== undefined && !isNaN(Number(body.standard_price))) {
      const variantRecords = await safeSearchRead(
        odoo,
        "product.product",
        [["product_tmpl_id", "=", templateId]],
        ["id"],
      );
      for (const v of variantRecords) {
        await odooWrite(odoo, "product.product", [v.id], {
          standard_price: Number(body.standard_price),
        });
      }
    }

    // ── Variant handling ─────────────────────────────────────────────────────
    if (body.variants && body.variants.length > 0) {
      const formSuffixes: string[] = [];
      const formVariantById: Record<number, any> = {};
      for (const v of body.variants) {
        const suffix = (v.name_suffix || "").trim();
        if (suffix) formSuffixes.push(suffix);
        if (v.id) formVariantById[Number(v.id)] = v;
      }

      if (formSuffixes.length > 0 || Object.keys(formVariantById).length > 0) {
        const existingLines: any = await safeSearchRead(
          odoo,
          "product.template.attribute.line",
          [["product_tmpl_id", "=", templateId]],
          ["id", "attribute_id"],
        );

        let targetAttrId: number;

        if (existingLines.length > 0) {
          targetAttrId = existingLines[0].attribute_id[0];
        } else {
          targetAttrId = await getOrCreateAttribute(odoo, "المواصفات");
        }

        // Get or create attribute values for each unique suffix
        const uniqueSuffixes = [...new Set(formSuffixes)];
        const suffixToValId: Record<string, number> = {};
        for (const suffix of uniqueSuffixes) {
          suffixToValId[suffix] = await getOrCreateAttributeValue(
            odoo,
            targetAttrId,
            suffix,
          );
        }

        const valueIds = Object.values(suffixToValId);

        if (valueIds.length > 0) {
          const existingLine = existingLines.find(
            (l: any) => Number(l.attribute_id[0]) === targetAttrId,
          );

          if (existingLine) {
            await odooWrite(
              odoo,
              "product.template.attribute.line",
              [existingLine.id],
              { value_ids: [[6, 0, valueIds]] },
            );
          } else {
            await odoo.execute_kw(
              "product.template.attribute.line",
              "create",
              [
                [
                  {
                    product_tmpl_id: templateId,
                    attribute_id: targetAttrId,
                    value_ids: [[6, 0, valueIds]],
                  },
                ],
              ],
            );
          }
        }

        // Fetch generated variants and match/update per-variant data
        const generatedVariants: any = await safeSearchRead(
          odoo,
          "product.product",
          [["product_tmpl_id", "=", templateId]],
          ["id", "name", "product_template_attribute_value_ids"],
        );

        // Fetch attribute value names for matching
        const allPtavIds = [
          ...new Set(
            generatedVariants.flatMap(
              (v: any) => v.product_template_attribute_value_ids || [],
            ),
          ),
        ];
        const ptavMap: Record<number, any> = {};
        if (allPtavIds.length > 0) {
          const ptavs = await safeSearchRead(
            odoo,
            "product.template.attribute.value",
            [["id", "in", allPtavIds]],
            ["id", "name"],
          );
          for (const ptav of ptavs as any[]) ptavMap[ptav.id] = ptav;
        }

        for (const variantData of generatedVariants) {
          const vid = variantData.id;
          const ptavIds = variantData.product_template_attribute_value_ids || [];
          const ptavNames = ptavIds
            .map((id: number) => ptavMap[id]?.name || "")
            .filter(Boolean);

          // Match: by id, or by attribute value name
          let matched: any = null;
          if (formVariantById[vid]) {
            matched = formVariantById[vid];
          } else {
            matched = body.variants.find(
              (v: any) =>
                v.name_suffix &&
                ptavNames.includes(v.name_suffix.trim()),
            );
          }

          if (!matched) continue;

          if (matched.barcode) {
            await odooWrite(odoo, "product.product", [vid], {
              barcode: matched.barcode,
            });
          }

          if (
            matched.price_extra !== undefined &&
            ptavIds.length > 0
          ) {
            await odooWrite(
              odoo,
              "product.template.attribute.value",
              [ptavIds[0]],
              { price_extra: Number(matched.price_extra) },
            );
          }

          if (matched.location_qty?.length) {
            for (const lq of matched.location_qty) {
              await updateOdooStock(
                odoo,
                vid,
                Number(lq.qty),
                lq.location_id,
              );
            }
          }
        }
      }
    }

    // ── Stock (no-variant products only) ─────────────────────────────────────
    if (!body.variants || body.variants.length === 0) {
      const finalProductId = await getVariantIdFromTemplate(odoo, templateId);

      if (finalProductId && body.location_qty?.length) {
        for (const lq of body.location_qty) {
          await updateOdooStock(odoo, finalProductId, Number(lq.qty), lq.location_id);
        }
      }
    }

    return {
      success: true,
      message: isEditMode ? "تم تحديث المنتج بنجاح" : "تم إنشاء المنتج بنجاح",
      id: templateId,
    };
  } catch (err: any) {
    const message =
      err.faultString ||
      err.statusMessage ||
      err.message ||
      "فشل في حفظ المنتج.";
    throw createError({
      statusCode: 400,
      statusMessage: message,
    });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getOrCreateAttribute(odoo: any, name: string): Promise<number> {
  const res: any = await safeSearchRead(
    odoo,
    "product.attribute",
    [["name", "=", name]],
    ["id"],
    1,
  );
  if (res.length > 0) return res[0].id;
  return await odoo.execute_kw("product.attribute", "create", [
    [{ name, create_variant: "always" }],
  ]);
}

async function getOrCreateAttributeValue(
  odoo: any,
  attributeId: number,
  valueName: string,
): Promise<number> {
  const res: any = await safeSearchRead(
    odoo,
    "product.attribute.value",
    [
      ["name", "=", valueName],
      ["attribute_id", "=", attributeId],
    ],
    ["id"],
    1,
  );
  if (res.length > 0) return res[0].id;
  return await odoo.execute_kw("product.attribute.value", "create", [
    [{ name: valueName, attribute_id: attributeId }],
  ]);
}

async function getVariantIdFromTemplate(
  odoo: any,
  templateId: number,
): Promise<number | null> {
  const res: any = await safeSearchRead(
    odoo,
    "product.product",
    [["product_tmpl_id", "=", templateId]],
    ["id"],
    1,
  );
  return res.length > 0 ? res[0].id : null;
}

async function updateOdooStock(
  odoo: any,
  productId: number,
  newQty: number,
  location_id?: number,
) {
  try {
    const locations: any = await safeSearchRead(
      odoo,
      "stock.location",
      [["usage", "=", "internal"]],
      ["id"],
      1,
    );

    if (!locations.length) {
      console.error("No internal location found");
      return;
    }

    const locationId = location_id ? Number(location_id) : locations[0].id;

    const quants: any = await safeSearchRead(
      odoo,
      "stock.quant",
      [
        ["product_id", "=", productId],
        ["location_id", "=", locationId],
      ],
      ["id", "quantity"],
      1,
    );

    let quantId: number;

    if (quants.length > 0) {
      quantId = quants[0].id;
      // Skip if qty unchanged — prevents unnecessary inventory adjustments
      const currentQty = Number(quants[0].quantity) || 0;
      if (currentQty === newQty) return;
      await odooWrite(odoo, "stock.quant", [quantId], {
        inventory_quantity: newQty,
      });
    } else {
      quantId = await odoo.execute_kw("stock.quant", "create", [
        [
          {
            product_id: productId,
            location_id: locationId,
            inventory_quantity: newQty,
          },
        ],
      ]);
    }

    await odoo.execute_kw("stock.quant", "action_apply_inventory", [[quantId]]);
  } catch (e: any) {
    console.error("Stock update error:", e);
  }
}

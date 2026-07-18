import { defineEventHandler, getQuery } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'pos_user')

  const query = getQuery(event);
  const page = query.page ? Math.max(1, parseInt(query.page as string)) : null;
  const limit = page ? 28 : 1000;
  const offset = page ? (page - 1) * limit : 0;
  const searchQuery = ((query.search as string) || "").trim().toLowerCase();

  const domain: any[] = [];
  if (searchQuery) {
    domain.push(["name", "ilike", searchQuery]);
  }

  const [countErr, totalCount] = await tryCatch(
    odoo.execute_kw("pos.category", "search_count", [[domain]]),
  );

  if (countErr) {
    throw createError({
      statusCode: 500,
      message: `فشل في حساب عدد الأقسام: ${countErr.message}`,
    });
  }

  // Find the available image field in Odoo dynamically
  let imageField = "image_128";
  try {
    // Pass attributes as a keyword dict, not as a positional array
    const fields: any = await odoo.execute_kw("pos.category", "fields_get", [
      [],
      { attributes: ["image_128", "image", "image_medium"] },
    ]);
    if (fields.image_128) {
      imageField = "image_128";
    } else if (fields.image) {
      imageField = "image";
    } else if (fields.image_medium) {
      imageField = "image_medium";
    }
  } catch (e) {
    console.warn(
      "fields_get failed for pos.category, defaulting to image_128",
      e,
    );
  }

  const fields = ["id", "name", "parent_id", "sequence", imageField];

  const [err, rawCategories] = await tryCatch(
    odoo.execute_kw("pos.category", "search_read", [
      [domain],
      {
        fields,
        limit,
        offset,
        order: "sequence, id desc",
      },
    ]),
  );

  if (err) {
    throw createError({
      statusCode: 500,
      message: `فشل في جلب الأقسام: ${err.message}`,
    });
  }

  const [productsErr, productsData] = await tryCatch(
    odoo.execute_kw("product.product", "search_read", [
      [],
      { fields: ["pos_categ_ids"] },
    ]),
  );

  const categoryCountMap: Record<number, number> = {};
  if (!productsErr && productsData) {
    for (const p of productsData) {
      if (p.pos_categ_ids) {
        for (const catId of p.pos_categ_ids) {
          categoryCountMap[catId] = (categoryCountMap[catId] || 0) + 1;
        }
      }
    }
  }

  const completeCategories = (rawCategories as any[]).map((cat: any) => {
    return {
      id: cat.id,
      name: cat.name,
      parent_id: cat.parent_id
        ? { id: cat.parent_id[0], name: cat.parent_id[1] }
        : null,
      sequence: cat.sequence || 0,
      image: cat[imageField] || null,
      productsCount: categoryCountMap[cat.id] || 0,
      status: "نشط",
    };
  });

  const totalProducts = Object.values(categoryCountMap).reduce(
    (sum, count) => sum + count,
    0,
  );

  if (page) {
    return {
      success: true,
      totalItems: totalCount,
      totalProducts,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      itemsPerPage: limit,
      data: completeCategories,
    };
  } else {
    return {
      success: true,
      data: completeCategories,
    };
  }
});

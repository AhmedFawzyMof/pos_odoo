import { defineEventHandler, readBody } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'pos_manager')

  let imageField = "image_128";
  try {
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
    console.warn("fields_get failed, defaulting to image_128", e);
  }

  const categoryValues: any = {
    name: body.name,
    sequence: isNaN(Number(body.sequence)) ? 0 : Number(body.sequence),
    parent_id: body.parent_id ? Number(body.parent_id) : false,
  };

  if (body.image !== undefined) {
    if (body.image) {
      const match = body.image.match(/^data:image\/\w+;base64,(.+)$/);
      categoryValues[imageField] = match ? match[1] : body.image;
    } else {
      categoryValues[imageField] = false;
    }
  }

  const isEditMode = !!body.id;
  let categoryId: number;

  if (isEditMode) {
    categoryId = Number(body.id);
    await odoo.execute_kw("pos.category", "write", [
      [[categoryId], categoryValues],
    ]);
  } else {
    categoryId = await odoo.execute_kw("pos.category", "create", [
      [categoryValues],
    ]);
  }

  return {
    success: true,
    message: isEditMode ? "تم تحديث القسم بنجاح" : "تم إنشاء القسم بنجاح",
    id: categoryId,
  };
});

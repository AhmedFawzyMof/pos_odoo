import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (!body.id) {
    throw createError({
      statusCode: 400,
      statusMessage: "معرّف المنتج مطلوب",
    });
  }

  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'pos_manager')

  try {
    const tmplFound = await odoo.execute_kw("product.template", "search", [
      [[["id", "=", body.id]]],
    ]);
    const model = tmplFound.length > 0 ? "product.template" : "product.product";
    await odoo.execute_kw(model, "write", [[[body.id], { active: true }]]);
  } catch (err: any) {
    const message =
      err.faultString ||
      err.statusMessage ||
      err.message ||
      "فشل في استعادة المنتج.";
    throw createError({
      statusCode: 400,
      statusMessage: message,
    });
  }

  return { success: true, message: "تم استعادة المنتج بنجاح" };
});

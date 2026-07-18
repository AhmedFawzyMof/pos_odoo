import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requireAnyPermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const orderId = Number(body?.order_id) || 0;

  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: "معرّف الطلب مطلوب" });
  }

  const items = (body.items || []).map((item: any) => ({
    line_id: item.line_id ? Number(item.line_id) : null,
    product_id: Number(item.product_id || item.productId) || 0,
    qty: Number(item.qty || item.quantity) || 0,
    price: Number(item.price || item.price_unit) || 0,
    discount: Number(item.discount) || 0,
    _deleted: Boolean(item._deleted),
  }));

  const sanitizedPayload = {
    items,
    order_discount: Number(body.order_discount) || 0,
    order_discount_type: body.order_discount_type || "fixed",
    service_fee: Number(body.service_fee) || 0,
    service_fee_type: body.service_fee_type || "fixed",
    customer_id: body.customer_id ? Number(body.customer_id) : false,
    note: body.note || "",
  };

  const odoo = await getAdminOdooClient();
  await requireAnyPermission(event, ['pos_manager', 'settings_access_rights'])

  const [rpcErr, result] = await tryCatch(
    odoo.execute_kw("custom.order.api", "api_update_order", [
      [],
      {
        order_id: orderId,
        ...sanitizedPayload,
      },
    ]),
  );

  if (rpcErr) {
    throw createError({
      statusCode: 500,
      message: `فشل تحديث الطلب: ${rpcErr.message}`,
    });
  }

  if (result?.status === "error") {
    throw createError({
      statusCode: 400,
      message: result.message || "فشل تحديث الطلب",
    });
  }

  return {
    success: true,
    message: result?.message || "تم تحديث الطلب بنجاح",
    order_id: orderId,
  };
});

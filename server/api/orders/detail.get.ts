import { defineEventHandler, getQuery, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

function toTuple(val: any): [number, string] | null {
  if (!val && val !== 0) return null;
  if (Array.isArray(val)) return [Number(val[0]) || 0, String(val[1] || "")];
  if (typeof val === "number" || typeof val === "string")
    return [Number(val) || 0, ""];
  return null;
}

function toFloat(val: any, fallback = 0): number {
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

function normalizeOrder(raw: any) {
  return {
    id: raw.id,
    name: raw.name || "",
    date_order: raw.date_order || "",
    partner_id: toTuple(raw.partner_id),
    user_id: toTuple(raw.user_id) || [0, ""],
    session_id: toTuple(raw.session_id) || [0, ""],
    amount_total: toFloat(raw.amount_total),
    amount_paid: toFloat(raw.amount_paid),
    amount_tax: toFloat(raw.amount_tax),
    amount_return: toFloat(raw.amount_return),
    state: raw.state || "draft",
    pos_reference: raw.pos_reference || "",
    company_id: toTuple(raw.company_id),
    session_summary: raw.session_summary,
    order_discount: toFloat(raw.order_discount),
    order_discount_type: raw.order_discount_type || "fixed",
    service_fee: toFloat(raw.service_fee),
    service_fee_type: raw.service_fee_type || "fixed",
    note: raw.note || "",
  };
}

function normalizeLine(raw: any) {
  return {
    id: raw.id,
    product_id: toTuple(raw.product_id) || [0, ""],
    qty: toFloat(raw.qty),
    price_unit: toFloat(raw.price_unit),
    price_subtotal: toFloat(raw.price_subtotal),
    discount: toFloat(raw.discount),
  };
}

function normalizePayment(raw: any) {
  return {
    id: raw.id,
    payment_method_id: toTuple(raw.payment_method_id) || [0, ""],
    amount: toFloat(raw.amount),
    payment_date: raw.payment_date || "",
    payment_status: raw.payment_status || "pending",
  };
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const orderId = parseInt((query.id as string) || "0", 10);
  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: "معرّف الطلب مطلوب" });
  }

  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'pos_user')

  const [rpcErr, result] = await tryCatch(
    odoo.execute_kw("custom.order.api", "api_get_order_detail", [
      [orderId],
      {},
    ]),
  );

  if (rpcErr) {
    throw createError({
      statusCode: 500,
      message: `فشل جلب تفاصيل الطلب: ${rpcErr.message}`,
    });
  }

  if (!result || result.status === "error" || !result.id) {
    throw createError({
      statusCode: 404,
      message: result?.message || "الطلب غير موجود في النظام",
    });
  }

  const [pmErr, pmData] = await tryCatch(
    odoo.searchRead("pos.payment.method", [], ["id", "name"]),
  );

  return {
    success: true,
    order: normalizeOrder(result),
    lines: (result.lines || []).map(normalizeLine),
    payments: (result.payments || []).map(normalizePayment),
    payment_methods: pmErr
      ? []
      : (pmData || []).map((pm: any) => ({
          id: pm.id,
          name: pm.name,
        })),
  };
});

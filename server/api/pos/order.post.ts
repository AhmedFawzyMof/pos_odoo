import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const sessionId = Number(body?.session_id) || null;
  if (!sessionId) {
    throw createError({
      statusCode: 400,
      statusMessage: "session_id is required",
    });
  }

  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'pos_user')

  const sanitizedPayload = {
    items: (body.items || []).map((item: any) => ({
      product_id: Number(item.product_id || item.productId) || 0,
      quantity: Number(item.quantity) || 0,
      price: Number(item.price) || 0,
      discount: Number(item.discount) || 0,
      tax_ids: (item.taxes_id || []).map(Number).filter((id: number) => id > 0),
    })),
    payments: (body.payments || []).map((pay: any) => ({
      amount: Number(pay.amount) || 0,
      method_id: Number(pay.method_id || pay.methodId) || 0,
    })),
    customer_id: Number(body.customer_id || body.customerId) || false,
    order_discount: Number(body.order_discount) || 0,
    order_discount_type: body.order_discount_type || "amount",
    service_fee: Number(body.service_fee) || 0,
    service_fee_type: body.service_fee_type || "amount",
    note: body.note || "",
    amount_tax: Number(body.amount_tax) || 0,
    target_location_id: body.location_id ? Number(body.location_id) : false,
  };

  const positionalParams = [sessionId, sanitizedPayload];

  const [rpcErr, rpcResult] = await tryCatch(
    odoo.execute_kw("pos.order", "create_pos_order_rpc", [positionalParams]),
  );

  if (rpcErr) {
    throw createError({
      statusCode: 500,
      message: `Core RPC Processing Failure: ${rpcErr.message}`,
    });
  }

  if (rpcResult.status === "error") {
    throw createError({
      statusCode: 400,
      message: rpcResult.message || "Failed to commit order transaction.",
    });
  }

  return {
    success: true,
    order_id: rpcResult.order_id,
    name: rpcResult.name || "",
    message: rpcResult.message || "Order registered successfully.",
  };
});

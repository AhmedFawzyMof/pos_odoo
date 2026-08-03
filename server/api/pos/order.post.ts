import { defineEventHandler, readBody, createError } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

const POS_WEBHOOK_URLS: Record<string, string> = {
  eldokanh_one: process.env.POS_WEBHOOK_URL_eldokanh_one || 'https://pos.eldokanh.com',
  eldokanh_two: process.env.POS_WEBHOOK_URL_eldokanh_two || 'https://postwo.eldokanh.com',
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const sessionId = Number(body?.session_id) || null;
  if (!sessionId) {
    throw createError({
      statusCode: 400,
      statusMessage: "session_id is required",
    });
  }

  const odoo = await getAdminOdooClient(event);
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
    driver_id: Number(body.driver_id) || false,
    delivery_cost: Number(body.delivery_cost) || 0,
    source: "callcenter",
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

  const orderId = rpcResult.order_id
  const orderName = rpcResult.order_name || rpcResult.name || ""

  await tryCatch(sendWebhook(event, orderId, orderName))

  return {
    success: true,
    order_id: orderId,
    name: orderName,
    message: rpcResult.message || "Order registered successfully.",
  };
});

async function sendWebhook(event: any, orderId: number, orderName: string) {
  const dbName = event.context.odooDb || process.env.DEFAULT_DB
  const baseUrl = process.env.POS_WEBHOOK_URL || POS_WEBHOOK_URLS[dbName] || 'https://localhost:3000'
  const secret = process.env.CALLCENTER_WEBHOOK_SECRET

  if (!secret) {
    console.log(`[webhook] CALLCENTER_WEBHOOK_SECRET not set, skipping`)
    return
  }

  const url = `${baseUrl}/api/notifications/callcenter-webhook`
  console.log(`[webhook] sending to ${url} for order ${orderName} (db=${dbName})`)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': secret,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_name: orderName,
        message: `Order ${orderName} created by callcenter`,
      }),
    })
    console.log(`[webhook] response ${res.status} ${res.statusText}`)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.log(`[webhook] body: ${text}`)
    }
  } catch (err: any) {
    console.log(`[webhook] fetch failed: ${err.message}`)
  }
}

import { defineEventHandler } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from "~~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const kpis = [
    {
      title: "إجمالي قيمة المخزون",
      value: "0",
      unit: "ج.م",
      change: "+0%",
      changeType: "positive",
      icon: "account_balance_wallet",
      color: "bg-primary-container/20 text-primary",
    },
    {
      title: "منتجات نفدت كميتها",
      value: "0",
      unit: "منتج",
      change: "مستقر",
      changeType: "positive",
      icon: "warning",
      color: "bg-error-container/40 text-error",
    },
    {
      title: "إجمالي القطع المتوفرة",
      value: "0",
      unit: "قطعة",
      change: "",
      changeType: "neutral",
      icon: "inventory",
      color: "bg-secondary-container/40 text-secondary",
    },
    {
      title: "شحنات قيد الوصول",
      value: "0",
      unit: "طلبيات",
      change: "",
      changeType: "neutral",
      icon: "local_shipping",
      color: "bg-tertiary-container/40 text-tertiary",
    },
  ];

  const odoo = await getAdminOdooClient();
  await requirePermission(event, "stock_user");

  const [kpiErr, data] = await tryCatch(
    odoo.execute_kw("kpi.dashboard", "get_storage_kpi", [[]]),
  );

  if (kpiErr) {
    throw createError({
      statusCode: 500,
      message: `فشل في جلب بيانات المخزون: ${kpiErr.message}`,
    });
  }

  const { inventory_value, out_of_stock, total_quantity, incoming_shipments } =
    data as any;

  kpis[0]!.value = (inventory_value as number).toLocaleString("en-US");
  kpis[1]!.value = String(out_of_stock);
  kpis[2]!.value = (total_quantity as number).toLocaleString("en-US");
  kpis[3]!.value = String(incoming_shipments);

  kpis[1]!.change = out_of_stock > 0 ? "عاجل" : "مستقر";
  kpis[1]!.changeType = out_of_stock > 0 ? "negative" : "positive";

  const [err, rawLocations] = await tryCatch(
    odoo.execute_kw("warehouse.location.api", "get_locations_with_capacity", [
      [],
    ]),
  );

  if (err) {
    throw createError({
      statusCode: 500,
      message: `فشل في جلب مواقع المستودع: ${err.message}`,
    });
  }

  const locations = rawLocations as any[];

  const [movementErr, movementData] = await tryCatch(
    odoo.execute_kw("warehouse.location.api", "get_recent_movements", [[]]),
  );

  if (movementErr) {
    throw createError({
      statusCode: 500,
      message: `فشل في جلب حركات المخزون: ${movementErr.message}`,
    });
  }

  const movement = movementData as any[];

  const query = getQuery(event);
  const page = query.page ? parseInt(query.page as string) : 1;
  const limit = query.limit ? parseInt(query.limit as string) : 10;

  const [stockLevelsError, stockLevels] = await tryCatch(
    odoo.execute_kw("warehouse.location.api", "get_top_sold_stock_levels", [
      [page, limit],
    ]),
  );

  if (stockLevelsError) {
    throw createError({
      statusCode: 500,
      message: `فشل في جلب مستويات المخزون: ${stockLevelsError.message}`,
    });
  }

  return {
    success: true,
    kpis,
    locations: locations.filter((loc) => !loc.partner_id && !loc.is_virtual),
    movement,
    stockLevels,
  };
});

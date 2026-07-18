import { defineEventHandler, getQuery } from "h3";
import { getAdminOdooClient } from "~~/server/utils/odooClient";
import { tryCatch } from "~~/server/utils/tryCatch";
import { requirePermission } from '~~/server/utils/permissions'

export default defineEventHandler(async (event) => {
  const kpis = [
    {
      title: "إيرادات الفترة",
      value: "0.00 ج.م",
      change: "--",
      changeType: "positive",
      icon: "trending_up",
      color: "primary",
    },
    {
      title: "المصاريف التشغيلية",
      value: "0.00 ج.م",
      change: "--",
      changeType: "negative",
      icon: "payments",
      color: "error",
    },
    {
      title: "منتجات منخفضة المخزون",
      value: "0 منتج",
      change: "عاجل",
      changeType: "warning",
      icon: "warning",
      color: "secondary",
    },
    {
      title: "إجمالي العملاء",
      value: "0 عميل",
      change: "--",
      changeType: "positive",
      icon: "group",
      color: "tertiary",
    },
  ];

  const { date_from, date_to } = getQuery(event);

  // Default to current month if not provided
  const now = new Date();
  const defaultDateFrom =
    date_from ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const defaultDateTo =
    date_to ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const odoo = await getAdminOdooClient();
  await requirePermission(event, 'pos_user')

  const [kpiErr, data] = await tryCatch(
    odoo.execute_kw("kpi.dashboard", "get_kpis", [
      [defaultDateFrom, defaultDateTo],
    ]),
  );
  if (kpiErr) {
    throw createError({
      statusCode: 500,
      message: `فشل في جلب بيانات الأداء: ${kpiErr.message}`,
    });
  }

  const { total_revenue, total_expenses, low_stock_count, total_customers } =
    data as any;

  kpis[0]!.value = `${(total_revenue as number).toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م`;
  kpis[1]!.value = `${(total_expenses as number).toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م`;
  kpis[2]!.value = `${low_stock_count} منتج`;
  kpis[3]!.value = `${total_customers} عميل`;

  kpis[2]!.change = low_stock_count > 0 ? "عاجل" : "مستقر";
  kpis[2]!.changeType = low_stock_count > 0 ? "warning" : "positive";

  return {
    success: true,
    kpis,
    date_from: defaultDateFrom,
    date_to: defaultDateTo,
  };
});

import type { SessionSummary, SessionDetail, SessionDetailProduct } from "~/types/pos";

function fmt(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string): string {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatTime(d: string): string {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(d: string): string {
  if (!d) return "";
  return `${formatDate(d)} ${formatTime(d)}`;
}

function getAllProducts(detail: SessionDetail | null): SessionDetailProduct[] {
  if (!detail) return [];
  const all: SessionDetailProduct[] = [];
  for (const cat of detail.products) {
    for (const p of cat.products) {
      all.push(p);
    }
  }
  return all.sort((a, b) => b.base_amount - a.base_amount);
}

function getTopProduct(detail: SessionDetail | null): SessionDetailProduct | null {
  const products = getAllProducts(detail);
  return products.length > 0 ? products[0]! : null;
}

function getTotalQty(detail: SessionDetail | null): number {
  if (!detail) return 0;
  return detail.products_info?.qty || 0;
}

function getCashPayment(detail: SessionDetail | null): { total: number; expected: number; counted: number; difference: number } | null {
  if (!detail) return null;
  const cashPayment = detail.payments?.find((p) => p.cash);
  if (!cashPayment) return null;
  return {
    total: cashPayment.total || 0,
    expected: cashPayment.final_count || 0,
    counted: cashPayment.money_counted || 0,
    difference: cashPayment.money_difference || 0,
  };
}

function getPaymentMethods(detail: SessionDetail | null): { name: string; total: number }[] {
  if (!detail) return [];
  const methodMap = new Map<string, number>();
  for (const p of detail.payments || []) {
    const methodName = p.name?.split(" ")[0] || p.name;
    methodMap.set(methodName, (methodMap.get(methodName) || 0) + p.total);
  }
  const result: { name: string; total: number }[] = [];
  for (const [name, total] of methodMap) {
    result.push({ name, total });
  }
  return result;
}

function getCashExpenses(summary: SessionSummary): number {
  return summary.cash_movements
    .filter((m) => m.type === "cash_out")
    .reduce((s, m) => s + m.amount, 0);
}

function openPrintWindow(html: string, title: string, width = 400, height = 700) {
  const w = window.open("", "_blank", `width=${width},height=${height},scrollbars=yes`);
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
}

export function useSessionPrint() {
  function printShort(summary: SessionSummary, detail: SessionDetail | null) {
    const top = getTopProduct(detail);
    const totalQty = getTotalQty(detail);
    const cashPayment = getCashPayment(detail);
    const cashExpected = cashPayment?.expected || summary.cash_balance;
    const cashStatus = cashPayment && Math.abs(cashPayment.difference) < 0.01 ? "متطابقة" : "غير متطابقة";
    const netSales = summary.total_sales;

    const html = `
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>ملخص الجلسة - ${summary.session_name}</title>
  <style>
    @page { margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Courier New", monospace;
      font-size: 12px;
      color: #000;
      background: #fff;
      width: 280px;
      margin: 0 auto;
      padding: 8px;
    }
    .no-print { display: block; }
    @media print {
      .no-print { display: none !important; }
      body { width: 100%; }
    }
    .header { text-align: center; margin-bottom: 8px; }
    .header .company { font-size: 14px; font-weight: bold; }
    .header .sub { font-size: 11px; color: #333; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .section-title { font-weight: bold; text-align: center; margin: 6px 0; font-size: 13px; }
    .row { display: flex; justify-content: space-between; padding: 2px 0; }
    .label { color: #333; }
    .value { font-weight: bold; }
    .footer { text-align: center; margin-top: 8px; font-size: 11px; color: #555; }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;padding:20px 0;">
    <button onclick="window.print()" style="padding:12px 40px;font-size:14px;font-weight:bold;background:#059669;color:white;border:none;border-radius:8px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
      🖨️ طباعة
    </button>
    <p style="margin-top:10px;font-size:12px;color:#888;">أو استخدم Ctrl+P</p>
  </div>
  <div class="header">
    <div class="company">${summary.config_name}</div>
    <div class="sub">${summary.user_name}</div>
  </div>
  <div class="divider"></div>
  <div class="section-title">📝 ملخص الوردية (النسخة المختصرة)</div>
  <div class="divider"></div>
  <div class="row"><span class="label">المسؤول والفرع:</span><span class="value">${summary.user_name} - ${summary.config_name}</span></div>
  <div class="row"><span class="label">المناوبة:</span><span class="value">${summary.session_name}</span></div>
  <div class="row"><span class="label">التوقيت:</span><span class="value">${formatDate(summary.start_at)} (${formatTime(summary.start_at)} - ${formatTime(summary.stop_at)})</span></div>
  <div class="divider"></div>
  <div class="row"><span class="label">صافي المبيعات المحصلة:</span><span class="value">${fmt(netSales)} ج.م</span></div>
  <div class="row"><span class="label">إجمالي القطع المباعة:</span><span class="value">${totalQty} قطعة</span></div>
  <div class="row"><span class="label">عدد الفواتير:</span><span class="value">${summary.orders_count}</span></div>
  ${top ? `<div class="row"><span class="label">أعلى منتج:</span><span class="value">${top.product_name} (${fmt(top.base_amount)} ج.م)</span></div>` : ""}
  <div class="divider"></div>
  <div class="row"><span class="label">حالة الخزينة:</span><span class="value">${cashStatus}</span></div>
  <div class="row"><span class="label">النقد المتوقع:</span><span class="value">${fmt(cashExpected)} ج.م</span></div>
  <div class="divider"></div>
  <div class="footer">
    <div>${summary.session_name}</div>
  </div>
</body>
</html>`;

    openPrintWindow(html, "ملخص مختصر", 420, 600);
  }

  function printFull(summary: SessionSummary, detail: SessionDetail | null) {
    const top = getTopProduct(detail);
    const products = getAllProducts(detail);
    const totalQty = getTotalQty(detail);
    const cashPayment = getCashPayment(detail);
    const paymentMethods = getPaymentMethods(detail);
    const cashExpenses = getCashExpenses(summary);
    const refundTotal = detail?.refund_info?.total || 0;

    const grossSales = detail ? (detail.products_info?.total || 0) + (detail.discount_amount || 0) : summary.total_sales;
    const discountAmount = detail?.discount_amount || 0;
    const netSales = summary.total_sales;
    const cashSales = cashPayment?.total || 0;
    const cashExpected = cashPayment?.expected || summary.cash_balance;
    const cashDifference = cashPayment?.difference || 0;
    const cashStatus = Math.abs(cashDifference) < 0.01 ? "متطابقة" : "غير متطابقة";

    const paymentMethodsHtml = paymentMethods
      .map((pm) => {
        const names: Record<string, string> = { Cash: "نقداً", Card: "فيزا", Visa: "فيزا", "Credit Card": "بطاقة ائتمان", "Debit Card": "بطاقة مدين" };
        return `${names[pm.name] || pm.name} ${fmt(pm.total)} ج.م`;
      })
      .join(" / ");

    let productsRowsHtml = "";
    if (products.length > 0) {
      productsRowsHtml = products
        .map(
          (p, i) => `
        <tr>
          <td style="text-align:center;padding:4px 2px;border-bottom:1px solid #ddd;">${i + 1}</td>
          <td style="text-align:right;padding:4px 2px;border-bottom:1px solid #ddd;">${p.product_name}</td>
          <td style="text-align:center;padding:4px 2px;border-bottom:1px solid #ddd;">${p.quantity}</td>
          <td style="text-align:left;padding:4px 2px;border-bottom:1px solid #ddd;">${fmt(p.base_amount)} ج.م</td>
        </tr>`
        )
        .join("");
    }

    let cashMovementsHtml = "";
    if (summary.cash_movements.length > 0) {
      cashMovementsHtml = `
        <h4 style="font-size:13px;margin:12px 0 6px;color:#1e40af;">حركات الخزنة</h4>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr>
              <th style="text-align:right;padding:4px 2px;border-bottom:2px solid #000;color:#1e40af;">البيان</th>
              <th style="text-align:left;padding:4px 2px;border-bottom:2px solid #000;color:#1e40af;">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            ${summary.cash_movements
              .map(
                (m) => `
              <tr>
                <td style="text-align:right;padding:3px 2px;border-bottom:1px solid #eee;">${m.reason}</td>
                <td style="text-align:left;padding:3px 2px;border-bottom:1px solid #eee;color:${m.type === "cash_in" ? "#059669" : "#dc2626"}">
                  ${m.type === "cash_in" ? "+" : "-"}${fmt(Math.abs(m.amount))} ج.م
                </td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>`;
    }

    const html = `
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>تقرير الجلسة - ${summary.session_name}</title>
  <style>
    @page { margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Arial", sans-serif;
      font-size: 13px;
      color: #1e293b;
      background: #fff;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    .no-print { display: block; }
    @media print {
      .no-print { display: none !important; }
      body { max-width: 100%; padding: 0; }
    }
    .report-header {
      text-align: center;
      border-bottom: 3px double #1e293b;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .report-header h1 { font-size: 20px; color: #1e293b; margin-bottom: 4px; }
    .report-header .company { font-size: 14px; color: #475569; }
    .section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 14px;
    }
    .section h3 { font-size: 14px; color: #1e40af; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .section .item { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; }
    .section .item .lbl { color: #475569; }
    .section .item .val { font-weight: bold; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: center; padding: 6px 4px; border-bottom: 2px solid #1e40af; color: #1e40af; font-size: 12px; }
    td { padding: 5px 4px; border-bottom: 1px solid #e2e8f0; }
    tr:last-child td { border-bottom: none; }
    .footer { text-align: center; margin-top: 20px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
    .highlight { background: #dbeafe; font-weight: bold; }
    .card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; text-align: center; }
    .card .num { font-size: 18px; font-weight: bold; color: #1e40af; }
    .card .lbl { font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;padding:20px 0;">
    <button onclick="window.print()" style="padding:12px 40px;font-size:14px;font-weight:bold;background:#059669;color:white;border:none;border-radius:8px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
      🖨️ طباعة التقرير
    </button>
    <p style="margin-top:10px;font-size:12px;color:#888;">أو استخدم Ctrl+P للطباعة</p>
  </div>

  <div class="report-header">
    <h1>📊 ملخص الوردية (النسخة الكاملة)</h1>
    <div class="company">${summary.config_name}</div>
  </div>

  <div class="section">
    <h3>⏱️ معلومات الجلسة</h3>
    <div class="item"><span class="lbl">اسم المستخدم:</span><span class="val">${summary.user_name}</span></div>
    <div class="item"><span class="lbl">الفرع:</span><span class="val">${summary.config_name}</span></div>
    <div class="item"><span class="lbl">المناوبة:</span><span class="val">${summary.session_name}</span></div>
    <div class="item"><span class="lbl">الفترة:</span><span class="val">${formatDateTime(summary.start_at)} إلى ${formatDateTime(summary.stop_at)}</span></div>
  </div>

  <div class="section">
    <h3>💰 ملخص درج النقدية (الخزينة)</h3>
    <div class="item"><span class="lbl">الرصيد الافتتاحي:</span><span class="val">${fmt(summary.opening_cash)} ج.م</span></div>
    <div class="item"><span class="lbl">(+) النقد المستلم (المبيعات):</span><span class="val">${fmt(cashSales)} ج.م</span></div>
    <div class="item"><span class="lbl">(-) المصروفات/المرتجعات:</span><span class="val" style="color:#dc2626;">${fmt(cashExpenses + refundTotal)} ج.م</span></div>
    <div class="item" style="border-top:1px solid #e2e8f0;padding-top:6px;margin-top:4px;">
      <span class="lbl">💵 النقد المتوقع في الدرج:</span>
      <span class="val" style="color:#059669;">${fmt(cashExpected)} ج.م</span>
    </div>
    ${cashPayment ? `<div class="item"><span class="lbl">النقد الفعلي:</span><span class="val">${fmt(cashPayment.counted)} ج.م</span></div>
    <div class="item"><span class="lbl">الفارق:</span><span class="val" style="color:${Math.abs(cashDifference) < 0.01 ? '#059669' : '#dc2626'}">${fmt(cashDifference)} ج.م</span></div>` : ""}
    <div class="item"><span class="lbl">الحالة:</span><span class="val" style="color:${cashStatus === 'متطابقة' ? '#059669' : '#dc2626'}">${cashStatus}</span></div>
  </div>

  <div class="section">
    <h3>📈 ملخص المبيعات والمالية</h3>
    <div class="card-grid">
      <div class="card">
        <div class="num">${summary.orders_count}</div>
        <div class="lbl">عدد الفواتير</div>
      </div>
      <div class="card">
        <div class="num">${totalQty}</div>
        <div class="lbl">إجمالي القطع</div>
      </div>
    </div>
    <div class="item" style="margin-top:8px;"><span class="lbl">إجمالي المبيعات (قبل الخصم):</span><span class="val">${fmt(grossSales)} ج.م</span></div>
    <div class="item"><span class="lbl">(-) إجمالي الخصومات:</span><span class="val" style="color:#dc2626;">${fmt(discountAmount)} ج.م</span></div>
    <div class="item" style="border-top:1px solid #e2e8f0;padding-top:6px;margin-top:4px;">
      <span class="lbl" style="font-weight:bold;">صافي المبيعات:</span>
      <span class="val" style="font-weight:bold;color:#059669;font-size:15px;">${fmt(netSales)} ج.م</span>
    </div>
    <div class="item"><span class="lbl">طرق الدفع:</span><span class="val">${paymentMethodsHtml || "---"}</span></div>
    ${detail?.discount_number ? `<div class="item"><span class="lbl">عدد الخصومات:</span><span class="val">${detail.discount_number}</span></div>` : ""}
  </div>

  ${products.length > 0 ? `
  <div class="section">
    <h3>📦 تفاصيل المنتجات المباعة (الأعلى مبيعاً)</h3>
    <table>
      <thead>
        <tr>
          <th style="width:40px;">#</th>
          <th style="text-align:right;">اسم المنتج</th>
          <th style="width:80px;">الكمية</th>
          <th style="width:120px;">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${productsRowsHtml}
      </tbody>
    </table>
  </div>` : ""}

  ${cashMovementsHtml}

  <div class="footer">
    <div>${summary.session_name}</div>
    <div style="margin-top:4px;">تقرير إغلاق الجلسة - ${formatDateTime(summary.start_at)}</div>
  </div>
</body>
</html>`;

    openPrintWindow(html, "تقرير الجلسة", 500, 800);
  }

  return { printShort, printFull };
}

export interface VendorBill {
  id: number;
  name: string;
  partner_id: [number, string] | false;
  invoice_date: string;
  invoice_date_due: string;
  amount_total: number;
  amount_residual: number;
  amount_tax: number;
  state: string;
  payment_state: string;
  invoice_payment_term_id: [number, string] | false;
  reference: string;
  supplier_reference: string;
  currency_id: [number, string] | false;
  company_id: [number, string] | false;
}

export interface VendorBillLine {
  id: number;
  product_id: [number, string] | false;
  name: string;
  quantity: number;
  price_unit: number;
  price_subtotal: number;
  price_total: number;
  tax_ids: { id: number; name: string }[];
  discount: number;
}

export interface VendorBillPayment {
  id: number;
  name: string;
  date: string;
  amount: number;
  journal_id: [number, string] | false;
  state: string;
}

export interface VendorBillDetail {
  id: number;
  name: string;
  partner_id: [number, string] | false;
  invoice_date: string;
  invoice_date_due: string;
  amount_total: number;
  amount_residual: number;
  amount_tax: number;
  amount_untaxed: number;
  state: string;
  payment_state: string;
  reference: string;
  supplier_reference: string;
  narration: string;
  currency_id: [number, string] | false;
  invoice_payment_term_id: [number, string] | false;
  lines: VendorBillLine[];
  purchase_orders: { id: number; name: string; date_order: string; amount_total: number; state: string }[];
  payments: VendorBillPayment[];
}

export interface VendorBillApiResponse {
  success: boolean;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  data: VendorBill[];
}

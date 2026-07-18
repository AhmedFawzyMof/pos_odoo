export interface PurchaseOrder {
  id: number;
  name: string;
  partner_id: [number, string] | false;
  date_order: string;
  amount_total: number;
  amount_untaxed: number;
  state: string;
  receipt_status: string;
  order_line_count: number;
  currency_id: [number, string] | false;
  partner_ref: string;
}

export interface POLine {
  id: number;
  product_id: [number, string] | false;
  name: string;
  product_qty: number;
  qty_received: number;
  qty_invoiced: number;
  price_unit: number;
  price_subtotal: number;
  price_total: number;
  list_price: number;
  date_planned: string;
  tax_ids: { id: number; name: string }[];
  location_allocations: { id: number; location_id: number; location_name: string; quantity: number }[];
}

export interface PickingMoveLine {
  product_id: [number, string] | false;
  qty_done: number;
  quantity: number;
}

export interface Picking {
  id: number;
  name: string;
  state: string;
  scheduled_date: string;
  move_lines: PickingMoveLine[];
}

export interface PurchaseOrderDetail {
  id: number;
  name: string;
  partner_id: [number, string] | false;
  date_order: string;
  date_approve: string;
  amount_total: number;
  amount_untaxed: number;
  state: string;
  partner_ref: string;
  notes: string;
  currency_id: [number, string] | false;
  lines: POLine[];
  pickings: Picking[];
  vendor_bills: { id: number; name: string; state: string; payment_state: string; amount_total: number; invoice_date: string }[];
}

export interface PurchaseOrderApiResponse {
  success: boolean;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  data: PurchaseOrder[];
}

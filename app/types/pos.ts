export interface POSRegister {
  id: number;
  name: string;
  session_id: number | null;
  session_state:
    | "opened"
    | "closed"
    | "opening_control"
    | "closing_control"
    | "unknown";
}

export interface POSCategory {
  id: number;
  name: string;
  parent_id?: { id: number; name: string } | null;
  sequence: number;
  image?: string | null;
  productsCount: number;
}

export interface POSAttributeValue {
  id: number;
  name: string;
  price_extra: number;
}

export interface POSAttributeLine {
  id: number;
  name: string;
  values: POSAttributeValue[];
}

export interface POSProductVariant {
  id: number;
  product_tmpl_id: number;
  name: string;
  display_name: string;
  barcode: string;
  list_price: number;
  price_extra: number;
  weight: number;
  to_weight: boolean;
  type: string;
  stock_by_location?: { location_id: number; location_name: string; quantity: number }[];
  attribute_values?: { attr_id: number; attr_name: string; value_id: number; value_name: string }[];
  taxes_id?: number[];
  taxes?: import("~/types/product").Tax[];
}

export interface POSProduct {
  id: number;
  product_tmpl_id?: number;
  name: string;
  display_name: string;
  barcode: string;
  type: "consu" | "service" | "product";
  list_price: number;
  standard_price: number;
  qty_available: number;
  virtual_available: number;
  incoming_qty: number;
  outgoing_qty: number;
  weight: number;
  volume: number;
  sale_ok: boolean;
  active: boolean;
  available_in_pos: boolean;
  to_weight?: boolean;
  pos_categ_ids?: number[];
  pos_categories?: { id: number; name: string }[];
  image_1920?: string | null;
  categ_id?: [number, string] | null;
  taxes_id?: number[];
  taxes?: import("~/types/product").Tax[];
  stock_by_location?: { location_id: number; location_name: string; quantity: number }[];
  price_extra?: number;
  attribute_values?: { attr_id: number; attr_name: string; value_id: number; value_name: string }[];
  attribute_lines?: POSAttributeLine[];
  variants?: POSProductVariant[];
}

export interface CartItem {
  product: POSProduct;
  variant?: POSProductVariant;
  quantity: number;
  price: number;
  discount: number;
}

export interface CartItem {
  product: POSProduct;
  quantity: number;
  price: number;
  discount: number;
}

export interface Cart {
  items: CartItem[];
  note: string;
  customer_id?: number | null;
}

export interface PaymentMethod {
  id: number;
  name: string;
  is_cash_count: boolean;
}

export interface PaymentLine {
  method_id: number;
  method_name: string;
  amount: number;
}

export interface OrderPayload {
  session_id: number;
  items: CartItem[];
  payments: PaymentLine[];
  note: string;
  order_discount: number;
  order_discount_type: "fixed" | "percent";
  service_fee: number;
  service_fee_type: "fixed" | "percent";
  customer_id: number | null;
  location_id: number | null;
}

export interface OrderResponse {
  success: boolean;
  order_id: number;
  name: string;
  message: string;
}

export interface CashMovementResponse {
  success: boolean;
  new_balance: number;
  message: string;
}

export interface CashMovement {
  type: "cash_in" | "cash_out";
  amount: number;
  reason: string;
  date?: string;
}

export interface SessionSummary {
  session_name: string;
  orders_count: number;
  total_sales: number;
  opening_cash: number;
  cash_balance: number;
  cash_movements: CashMovement[];
  user_name: string;
  config_name: string;
  start_at: string;
  stop_at: string;
  session_state: string;
}

export interface SessionDetailProduct {
  product_id: number;
  product_name: string;
  code: string;
  quantity: number;
  price_unit: number;
  discount: number;
  uom: string;
  total_paid: number;
  base_amount: number;
}

export interface SessionDetailCategory {
  name: string;
  products: SessionDetailProduct[];
  total: number;
  qty: number;
}

export interface SessionDetailPayment {
  id: number;
  name: string;
  session: number;
  cash: boolean;
  total: number;
  final_count: number;
  money_counted: number;
  money_difference: number;
  cash_moves: { name: string; amount: number }[];
  count: boolean;
}

export interface SessionDetailTax {
  name: string;
  tax_amount: number;
  base_amount: number;
}

export interface SessionDetail {
  state: string;
  currency: {
    symbol: string;
    position: boolean;
    total_paid: number;
    precision: number;
  };
  nbr_orders: number;
  date_start: string;
  date_stop: string;
  session_name: string;
  config_names: string[];
  company_name: string;
  payments: SessionDetailPayment[];
  taxes: SessionDetailTax[];
  taxes_info: { tax_amount: number; base_amount: number };
  products: SessionDetailCategory[];
  products_info: { total: number; qty: number };
  refund_taxes: SessionDetailTax[];
  refund_taxes_info: { tax_amount: number; base_amount: number };
  refund_info: { total: number; qty: number };
  refund_products: SessionDetailCategory[];
  discount_number: number;
  discount_amount: number;
  invoiceList: { name: string; invoices: any[] }[];
  invoiceTotal: number;
  total_paid: number;
  payments_per_method: { name: string; total: number }[];
  show_payment_per_method: boolean;
  cash_rounding_total: number;
  opening_note: string;
  closing_note: string;
}

export interface POSOrder {
  id: number;
  name: string;
  date_order: string;
  partner_id: [number, string] | null;
  user_id: [number, string];
  session_id: [number, string];
  amount_total: number;
  amount_paid: number;
  amount_tax: number;
  amount_return: number;
  amount_discount: number;
  state: "draft" | "paid" | "done" | "cancelled" | "invoiced" | "refund";
  pos_reference?: string;
  company_id?: [number, string];
  lines?: OrderLine[];
  statement_ids?: OrderPayment[];
  order_discount?: number;
  order_discount_type?: string;
  service_fee?: number;
  service_fee_type?: string;
  note?: string;
}

export interface OrderLine {
  id: number;
  product_id: [number, string];
  qty: number;
  price_unit: number;
  price_subtotal: number;
  discount: number;
}

export interface OrderPayment {
  id: number;
  payment_method_id: [number, string];
  amount: number;
  payment_date: string;
  payment_status: "pending" | "paid" | "reversed";
}

export interface OrderListResponse {
  success: boolean;
  data: POSOrder[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}

export interface OrderDetailResponse {
  success: boolean;
  order: POSOrder;
  lines: OrderLine[];
  payments: OrderPayment[];
  payment_methods?: PaymentMethod[];
}

export interface OrderStatusPayload {
  order_id: number;
  state: string;
}

export interface OrderPaymentsPayload {
  order_id: number;
  payments: { id: number | null; method_id: number; amount: number }[];
}

export interface OrderRemoveItemPayload {
  order_id: number;
  line_id: number;
}

export interface OrderUpdateItem {
  line_id?: number | null;
  product_id: number;
  product_name?: string;
  qty: number;
  price: number;
  discount: number;
  _deleted?: boolean;
}

export interface OrderUpdatePayload {
  order_id: number;
  items: OrderUpdateItem[];
  order_discount: number;
  order_discount_type: "fixed" | "percent";
  service_fee: number;
  service_fee_type: "fixed" | "percent";
  customer_id: number | false;
  note: string;
}

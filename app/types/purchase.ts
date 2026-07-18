export interface Supplier {
  id: number;
  name: string;
}

export interface ProductResult {
  id: number;
  name: string;
  barcode: string;
  standard_price?: number;
  list_price?: number;
  taxes_id?: number[];
}

export interface LocationAllocation {
  location_id: number;
  location_name?: string;
  quantity: number;
}

export interface POLineInput {
  id?: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  price_unit: number;
  list_price?: number;
  location_allocations?: LocationAllocation[];
  tax_ids: number[];
}

export interface VendorBillResult {
  id: number;
  name: string;
  partner_id: [number, string] | false;
  invoice_date: string;
  amount_total: number;
  amount_residual: number;
  payment_state: string;
}

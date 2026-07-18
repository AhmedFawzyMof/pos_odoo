export interface POSCategory {
  id: number;
  name: string;
}

export interface InternalCategory {
  id: number;
  name: string;
}

export interface Tax {
  id: number;
  name: string;
  amount: number;
  amount_type?: string;
  price_include?: boolean;
}

export interface ProductVariant {
  id: number;
  name?: string;
  display_name?: string;
  barcode: string;
  lst_price: number;
  price_extra?: number;
  standard_price?: number;
  product_template_attribute_value_ids: number[];
  stock_locations?: { location_id: number; location_name: string; qty: number }[];
}

export interface Product {
  id?: number;
  name: string;
  display_name?: string;
  barcode: string;
  type: "consu" | "service" | "product";
  categ_id?: [number, string] | null;
  internal_category?: InternalCategory | null;
  list_price: number;
  standard_price: number;
  qty_available: number;
  virtual_available: number;
  incoming_qty: number;
  outgoing_qty: number;
  weight: number;
  volume: number;
  sale_ok: boolean;
  purchase_ok: boolean;
  active: boolean;
  available_in_pos: boolean;
  to_weight?: boolean;
  location_id?: number | null;
  location?: { id: number; name: string } | null;
  stock_locations?: { location_id: number; location_name: string; qty: number }[];
  pos_categ_ids?: number[];
  pos_categories?: POSCategory[];
  taxes_id?: number[];
  taxes?: Tax[];
  image_1920?: string | null;
  product_variant_ids?: ProductVariant[];
}

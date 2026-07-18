export interface Supplier {
  id: number;
  name: string;
  email: string;
  phone: string;
  vat: string;
  street: string;
  city: string;
  country_id: [number, string] | false;
  property_supplier_payment_term_id: [number, string] | false;
  total_purchased: number;
  outstanding: number;
  overdue: number;
  supplier_rank: number;
}

export interface SupplierApiResponse {
  success: boolean;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  data: Supplier[];
}

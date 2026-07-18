export interface AddressDetails {
  street: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  fullAddress: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  type: string;
  tier: string;
  points: number;
  companyName: string;
  taxId: string;
  birthDate: string;
  totalSpent: number;
  addressDetails: AddressDetails;
  transactions: CustomerOrder[];
}

export interface CustomerMeta {
  totalB2B: number;
  activeRecent: number;
  loyaltyCount: number;
}

export interface CustomerApiResponse {
  success: boolean;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  data: Customer[];
  meta: CustomerMeta;
}

export interface CustomerOrder {
  id: number;
  name: string;
  date: string;
  amount: number;
  state: string;
}

export interface CustomerDetailResponse {
  success: boolean;
  data: Customer;
}

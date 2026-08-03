export interface Driver {
  id: number;
  name: string;
  email: string;
  phone: string;
  carriers: string[];
  createdAt: string;
}

export interface DriverApiResponse {
  success: boolean;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  data: Driver[];
}

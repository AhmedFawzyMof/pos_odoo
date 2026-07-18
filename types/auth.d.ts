declare module "#auth-utils" {
  interface User {
    id: number;
    odooUserId: number;
    name: string;
    roles: string[];
  }
  interface UserSession {
    odooPassword: string;
    odooUsername: string;
    currentCompanyId?: number;
  }
}

export {};

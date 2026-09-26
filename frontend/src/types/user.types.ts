export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface UserFilterParams {
  search?: string;
  page?: number;
  limit?: number;
}

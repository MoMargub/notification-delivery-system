export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

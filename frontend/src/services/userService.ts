import { apiRequest } from '@/lib/apiClient';
import type { PaginatedResponse } from '@/types/api.types';
import type { User, UserFilterParams } from '@/types/user.types';

export const userService = {
  list: (params: UserFilterParams) => apiRequest<PaginatedResponse<User>>('/users', { params }),
};